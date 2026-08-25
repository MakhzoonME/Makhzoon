import 'server-only'

import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { notificationQueue } from '@/lib/notifications/notification-queue'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AppointmentStatus, HarakaAppointment } from '@/types'
import { resolveListForOrg, resolveListItemForOrg } from '@/lib/db/managed-lists'
import {
  AppointmentsRepository,
  type ListAppointmentsOpts,
} from './appointments.repository'
import { StaffAvailabilityRepository } from '@/lib/modules/haraka/staff/availability.repository'
import {
  fitsWorkingWindows,
  findConflict,
  minutesToTime,
  resolveWorkingWindows,
  toZonedInstant,
} from './availability'

const repo = new AppointmentsRepository()
const availabilityRepo = new StaffAvailabilityRepository()

type Row = Record<string, unknown>

function requireView(tenant: TenantContext) {
  if (!hasPermission(tenant, 'haraka', 'appointmentsView')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireOp(
  tenant: TenantContext,
  op:
    | 'appointmentsCreate'
    | 'appointmentsUpdate'
    | 'appointmentsGenerateInvoice'
    | 'appointmentsAddPayment',
) {
  if (!hasPermission(tenant, 'haraka', op)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

/** The 4 built-in transitions each have their own permission, mirroring how
 *  Retainers gates pause/cancel/reactivate separately. A custom status an org
 *  added beyond the platform defaults falls back to the general update
 *  permission, since there's no dedicated permission key for it. */
function requireStatusChange(tenant: TenantContext, to: AppointmentStatus) {
  const op =
    to === 'confirmed' ? 'appointmentsConfirm'
    : to === 'completed' ? 'appointmentsComplete'
    : to === 'cancelled' ? 'appointmentsCancel'
    : to === 'no_show'   ? 'appointmentsMarkNoShow'
    : 'appointmentsUpdate'
  if (!hasPermission(tenant, 'haraka', op)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function badRequest(error: string, extra?: Record<string, unknown>): never {
  throw NextResponse.json({ error, ...extra }, { status: 400 })
}

export class AppointmentsService {
  async list(tenant: TenantContext, opts?: ListAppointmentsOpts) {
    requireView(tenant)
    return repo.list(tenant, opts)
  }

  async getById(tenant: TenantContext, id: string) {
    requireView(tenant)
    const appointment = await repo.getById(tenant, id)
    if (!appointment) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    return appointment
  }

  /**
   * Both halves of the booking guard (design doc §4.2), run server-side so the
   * caller gets a clean validation error instead of a DB exception:
   *   1. the requested block sits inside the provider's working hours for that
   *      date (exception overrides the weekly pattern), and
   *   2. it doesn't overlap another appointment that still holds its slot.
   */
  private async assertSlotBookable(
    tenant: TenantContext,
    args: {
      staffId: string
      scheduledAt: string
      durationMinutes: number
      excludeAppointmentId?: string
    },
  ): Promise<void> {
    const when = new Date(args.scheduledAt)
    if (isNaN(when.getTime())) badRequest('Invalid appointment date/time')

    const timeZone = await repo.getOrgTimezone(tenant.organizationId)
    const zoned = toZonedInstant(when, timeZone)
    const endMinutes = zoned.minutesOfDay + args.durationMinutes

    const rules = await availabilityRepo.getDayRules(
      tenant.organizationId,
      args.staffId,
      zoned.dayOfWeek,
      zoned.isoDate,
    )
    const windows = resolveWorkingWindows(rules)

    if (windows.length === 0) {
      badRequest(
        rules.exception
          ? `This provider is off on ${zoned.isoDate}.`
          : 'This provider has no working hours set for that day.',
        { code: 'OUTSIDE_WORKING_HOURS' },
      )
    }

    if (!fitsWorkingWindows(zoned.minutesOfDay, endMinutes, windows)) {
      const hours = windows.map((w) => `${minutesToTime(w.startMinutes)}–${minutesToTime(w.endMinutes)}`).join(', ')
      badRequest(
        `${minutesToTime(zoned.minutesOfDay)}–${minutesToTime(endMinutes)} falls outside this provider's hours on ${zoned.isoDate} (${hours}).`,
        { code: 'OUTSIDE_WORKING_HOURS' },
      )
    }

    const statusList = await resolveListForOrg(tenant.organizationId, 'appointment_status')
    const blockingStatuses = statusList.filter((s) => s.isBlocking).map((s) => s.value)
    const existing = await repo.findBlockingBookings(
      tenant.organizationId,
      args.staffId,
      args.scheduledAt,
      args.durationMinutes,
      blockingStatuses,
    )
    const conflict = findConflict(
      { scheduledAt: when, durationMinutes: args.durationMinutes },
      existing,
      args.excludeAppointmentId,
    )
    if (conflict) {
      badRequest('This provider already has an appointment overlapping that slot.', {
        code: 'SLOT_TAKEN',
        conflictingAppointmentId: conflict.id,
      })
    }
  }

  /** Catalog + provider validation, plus the price/duration/tax snapshot that
   *  gets frozen onto the appointment row. */
  private async resolveBookingSnapshot(
    tenant: TenantContext,
    serviceId: string,
    staffId: string,
    durationOverride?: number | null,
  ): Promise<{ durationMinutes: number; price: number; taxRate: number | null }> {
    const [serviceRes, staffRes] = await Promise.all([
      supabaseAdmin
        .from('haraka_services')
        .select('id, organization_id, price, tax_rate_id, active, duration_minutes, appointment_bookable')
        .eq('id', serviceId)
        .maybeSingle(),
      supabaseAdmin
        .from('haraka_staff')
        .select('id, organization_id, capabilities, is_active')
        .eq('id', staffId)
        .maybeSingle(),
    ])

    const service = serviceRes.data as Row | null
    if (!service || service.organization_id !== tenant.organizationId) {
      badRequest('Service not found')
    }
    if (service.active === false) badRequest('That service is inactive')
    if (service.appointment_bookable !== true) {
      badRequest('That service is not bookable as an appointment')
    }

    const staff = staffRes.data as Row | null
    if (!staff || staff.organization_id !== tenant.organizationId) {
      badRequest('Provider not found')
    }
    if (staff.is_active === false) badRequest('That provider is inactive')
    const capabilities = (staff.capabilities as string[]) ?? []
    if (!capabilities.includes('appointment_provider')) {
      badRequest('That worker is not tagged as an appointment provider')
    }

    const durationMinutes = durationOverride ?? Number(service.duration_minutes ?? 0)
    if (!durationMinutes || durationMinutes <= 0) {
      badRequest('This service has no duration set — add one before booking it.')
    }

    // Tax is snapshotted as a plain rate so a later tax-rate edit never
    // rewrites a past booking's total.
    let taxRate: number | null = null
    if (service.tax_rate_id) {
      const { data: rate } = await supabaseAdmin
        .from('tax_rates')
        .select('rate, organization_id')
        .eq('id', service.tax_rate_id as string)
        .maybeSingle()
      const r = rate as Row | null
      if (r && r.organization_id === tenant.organizationId) taxRate = Number(r.rate ?? 0)
    }

    return { durationMinutes, price: Number(service.price ?? 0), taxRate }
  }

  async create(
    tenant: TenantContext,
    input: {
      customerId?: string | null
      customerName: string
      customerPhone?: string | null
      serviceId: string
      staffId: string
      scheduledAt: string
      durationMinutes?: number | null
      notes?: string | null
    },
  ): Promise<HarakaAppointment> {
    requireOp(tenant, 'appointmentsCreate')

    const snapshot = await this.resolveBookingSnapshot(
      tenant,
      input.serviceId,
      input.staffId,
      input.durationMinutes,
    )
    await this.assertSlotBookable(tenant, {
      staffId: input.staffId,
      scheduledAt: input.scheduledAt,
      durationMinutes: snapshot.durationMinutes,
    })

    const appointment = await repo.create(tenant, {
      customerId:      input.customerId ?? null,
      customerName:    input.customerName,
      customerPhone:   input.customerPhone ?? null,
      serviceId:       input.serviceId,
      staffId:         input.staffId,
      scheduledAt:     input.scheduledAt,
      durationMinutes: snapshot.durationMinutes,
      price:           snapshot.price,
      taxRate:         snapshot.taxRate,
      notes:           input.notes ?? null,
    })

    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'APPOINTMENT_CREATED',
      recordId: appointment.id,
      newValue: {
        appointmentNumber: appointment.appointmentNumber,
        scheduledAt:       appointment.scheduledAt,
        staffId:           appointment.staffId,
        total:             appointment.total,
      },
    })
    notificationQueue.enqueue({
      tenant,
      eventType:     'appointment.booked',
      data:          {
        appointmentNumber: appointment.appointmentNumber,
        customerName:      appointment.customerName,
        scheduledAt:       appointment.scheduledAt.toISOString(),
      },
      link:          `/haraka/appointments/${appointment.id}`,
      titleOverride: `Appointment ${appointment.appointmentNumber} booked`,
    })
    return appointment
  }

  /** Edits, including reschedules. Any change to time, duration, or provider
   *  re-runs the full booking guard against the new slot. */
  async update(
    tenant: TenantContext,
    id: string,
    patch: {
      customerName?: string
      customerPhone?: string | null
      scheduledAt?: string
      durationMinutes?: number
      staffId?: string
      notes?: string | null
    },
  ): Promise<HarakaAppointment> {
    requireOp(tenant, 'appointmentsUpdate')
    const current = await this.getById(tenant, id)

    const currentStatusItem = await resolveListItemForOrg(tenant.organizationId, 'appointment_status', current.status)
    if (currentStatusItem?.isTerminal) {
      badRequest(`A ${current.status.replace('_', '-')} appointment can no longer be edited`)
    }

    const reschedules =
      patch.scheduledAt !== undefined ||
      patch.durationMinutes !== undefined ||
      patch.staffId !== undefined

    if (reschedules) {
      const staffId = patch.staffId ?? current.staffId
      const durationMinutes = patch.durationMinutes ?? current.durationMinutes
      const scheduledAt = patch.scheduledAt ?? current.scheduledAt.toISOString()

      if (patch.staffId && patch.staffId !== current.staffId) {
        // Re-validates the capability tag on the incoming provider.
        await this.resolveBookingSnapshot(tenant, current.serviceId, staffId, durationMinutes)
      }
      await this.assertSlotBookable(tenant, {
        staffId,
        scheduledAt,
        durationMinutes,
        excludeAppointmentId: id,
      })
    }

    const appointment = await repo.update(tenant, id, patch)
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'APPOINTMENT_UPDATED',
      recordId: id,
      newValue: patch,
    })
    return appointment
  }

  async updateStatus(tenant: TenantContext, id: string, status: AppointmentStatus) {
    requireStatusChange(tenant, status)
    const current = await this.getById(tenant, id)
    const targetStatusItem = await resolveListItemForOrg(tenant.organizationId, 'appointment_status', status)
    if (!targetStatusItem) {
      badRequest(`'${status}' is not a status configured for this organization`)
    }

    const updated = await repo.updateStatus(tenant, id, status)
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'APPOINTMENT_STATUS_CHANGED',
      recordId: id,
      newValue: { from: current.status, to: status },
    })
    notificationQueue.enqueue({
      tenant,
      eventType:     'appointment.status_changed',
      data:          { appointmentNumber: current.appointmentNumber, status },
      link:          `/haraka/appointments/${id}`,
      titleOverride: `Appointment ${current.appointmentNumber} is now ${status.replace('_', ' ')}`,
    })
    return updated
  }

  async generateInvoice(tenant: TenantContext, id: string) {
    requireOp(tenant, 'appointmentsGenerateInvoice')
    const appointment = await this.getById(tenant, id)
    const statusItem = await resolveListItemForOrg(tenant.organizationId, 'appointment_status', appointment.status)
    if (!statusItem?.isInvoicingTrigger) {
      throw NextResponse.json(
        { error: 'Invoice can only be generated once the appointment reaches an invoicing status' },
        { status: 400 },
      )
    }
    const updated = await repo.generateInvoiceNumber(tenant, id)
    if (updated.invoiceNumber !== appointment.invoiceNumber) {
      auditLog.queue({
        tenant,
        module:   'pos',
        action:   'APPOINTMENT_INVOICE_GENERATED',
        recordId: id,
        newValue: { invoiceNumber: updated.invoiceNumber },
      })
    }
    return updated
  }

  async delete(tenant: TenantContext, id: string) {
    requireOp(tenant, 'appointmentsUpdate')
    const appointment = await this.getById(tenant, id)
    const statusItem = await resolveListItemForOrg(tenant.organizationId, 'appointment_status', appointment.status)
    if (statusItem?.isInvoicingTrigger) {
      throw NextResponse.json(
        { error: 'An invoiced appointment cannot be deleted' },
        { status: 400 },
      )
    }
    await repo.delete(tenant, id)
    auditLog.queue({ tenant, module: 'pos', action: 'APPOINTMENT_DELETED', recordId: id })
  }

  // ── Payments ────────────────────────────────────────────────────────────

  async listPayments(tenant: TenantContext, appointmentId: string) {
    requireView(tenant)
    await this.getById(tenant, appointmentId)
    return repo.listPayments(tenant, appointmentId)
  }

  async addPayment(
    tenant: TenantContext,
    appointmentId: string,
    amount: number,
    paymentMethod: string | null,
    note: string | null,
  ) {
    requireOp(tenant, 'appointmentsAddPayment')
    const appointment = await this.getById(tenant, appointmentId)
    const statusItem = await resolveListItemForOrg(tenant.organizationId, 'appointment_status', appointment.status)
    if (statusItem?.isTerminal && !statusItem.isInvoicingTrigger) {
      badRequest(`A ${appointment.status.replace('_', '-')} appointment cannot take payments`)
    }
    const updated = await repo.addPayment(tenant, appointmentId, amount, paymentMethod, note)
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'APPOINTMENT_PAYMENT_ADDED',
      recordId: appointmentId,
      newValue: { amount, paymentMethod, paymentStatus: updated.paymentStatus },
    })
    return updated
  }

  async removePayment(tenant: TenantContext, appointmentId: string, paymentId: string) {
    requireOp(tenant, 'appointmentsAddPayment')
    await this.getById(tenant, appointmentId)
    const updated = await repo.removePayment(tenant, appointmentId, paymentId)
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'APPOINTMENT_PAYMENT_REMOVED',
      recordId: appointmentId,
      newValue: { paymentId },
    })
    return updated
  }
}
