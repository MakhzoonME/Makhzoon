import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type {
  AppointmentStatus,
  HarakaAppointment,
  HarakaAppointmentPayment,
  OrderPaymentStatus,
} from '@/types'
import { BLOCKING_APPOINTMENT_STATUSES } from '@/types'
import {
  allocateAppointmentNumber,
  allocateAppointmentInvoiceNumber,
} from './appointment-numbering'
import { DEFAULT_ORG_TIMEZONE, type ExistingBooking } from './availability'

type Row = Record<string, unknown>

function toAppointment(r: Row): HarakaAppointment {
  return {
    id:                r.id as string,
    organizationId:    r.organization_id as string,
    spaceId:           (r.space_id as string) ?? null,
    appointmentNumber: r.appointment_number as string,
    invoiceNumber:     (r.invoice_number as string) ?? null,

    customerId:        (r.customer_id as string) ?? null,
    customerName:      r.customer_name as string,
    customerPhone:     (r.customer_phone as string) ?? null,

    serviceId:         r.service_id as string,
    staffId:           r.staff_id as string,

    scheduledAt:       r.scheduled_at ? new Date(r.scheduled_at as string) : new Date(),
    durationMinutes:   Number(r.duration_minutes ?? 0),
    price:             Number(r.price ?? 0),
    taxRate:           r.tax_rate == null ? null : Number(r.tax_rate),

    status:            (r.status as AppointmentStatus) ?? 'scheduled',
    taxAmount:         Number(r.tax_amount ?? 0),
    total:             Number(r.total ?? 0),
    paymentStatus:     (r.payment_status as OrderPaymentStatus) ?? 'unpaid',
    amountPaid:        Number(r.amount_paid ?? 0),

    notes:             (r.notes as string) ?? null,
    createdAt:         r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy:         (r.created_by as string) ?? null,
    updatedAt:         r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy:         (r.updated_by as string) ?? null,
  }
}

function toPayment(r: Row): HarakaAppointmentPayment {
  return {
    id:             r.id as string,
    appointmentId:  r.appointment_id as string,
    organizationId: r.organization_id as string,
    amount:         Number(r.amount ?? 0),
    paymentMethod:  (r.payment_method as string) ?? null,
    note:           (r.note as string) ?? null,
    paidAt:         r.paid_at ? new Date(r.paid_at as string) : new Date(),
    createdAt:      r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy:      (r.created_by as string) ?? null,
  }
}

/** Rounded to 4 dp — the scale of every numeric money column in Haraka. */
function money(n: number): number {
  return Math.round(n * 10_000) / 10_000
}

function derivePaymentStatus(total: number, paid: number): OrderPaymentStatus {
  if (paid <= 0.0001) return 'unpaid'
  if (paid + 0.0001 >= total) return 'paid'
  return 'partial'
}

export interface ListAppointmentsOpts {
  status?:    string
  staffId?:   string
  serviceId?: string
  /** ISO instants — the calendar passes a day/week range. */
  from?:      string
  to?:        string
  page?:      number
  pageSize?:  number
}

export interface CreateAppointmentInput {
  customerId?:      string | null
  customerName:     string
  customerPhone?:   string | null
  serviceId:        string
  staffId:          string
  scheduledAt:      string
  durationMinutes:  number
  price:            number
  taxRate:          number | null
  notes?:           string | null
}

export interface UpdateAppointmentInput {
  customerName?:    string
  customerPhone?:   string | null
  scheduledAt?:     string
  durationMinutes?: number
  staffId?:         string
  notes?:           string | null
}

export class AppointmentsRepository {
  /** The zone that reconciles timezone-naive availability with scheduled_at. */
  async getOrgTimezone(organizationId: string): Promise<string> {
    const { data } = await supabaseAdmin
      .from('organizations')
      .select('timezone')
      .eq('id', organizationId)
      .maybeSingle()
    const tz = (data as Row | null)?.timezone
    return typeof tz === 'string' && tz.length > 0 ? tz : DEFAULT_ORG_TIMEZONE
  }

  /** Bulk-fetch service and provider names for a page of appointments,
   *  mutating them in place (same shape as ServiceJobsRepository's enrich). */
  private async enrichNames(appointments: HarakaAppointment[]): Promise<void> {
    if (appointments.length === 0) return
    const serviceIds = [...new Set(appointments.map((a) => a.serviceId))]
    const staffIds = [...new Set(appointments.map((a) => a.staffId))]

    const [servicesRes, staffRes] = await Promise.all([
      supabaseAdmin.from('haraka_services').select('id, name').in('id', serviceIds),
      supabaseAdmin.from('haraka_staff').select('id, name').in('id', staffIds),
    ])

    const serviceNames = new Map<string, string>()
    for (const s of (servicesRes.data ?? []) as Row[]) {
      serviceNames.set(s.id as string, s.name as string)
    }
    const staffNames = new Map<string, string>()
    for (const s of (staffRes.data ?? []) as Row[]) {
      staffNames.set(s.id as string, s.name as string)
    }

    for (const a of appointments) {
      a.serviceName = serviceNames.get(a.serviceId) ?? null
      a.staffName = staffNames.get(a.staffId) ?? null
    }
  }

  async list(tenant: TenantContext, opts?: ListAppointmentsOpts) {
    let q = supabaseAdmin
      .from('haraka_appointments')
      .select('*', { count: 'exact' })
      .eq('organization_id', tenant.organizationId)
    if (tenant.spaceId) q = q.eq('space_id', tenant.spaceId)
    if (opts?.status) q = q.eq('status', opts.status)
    if (opts?.staffId) q = q.eq('staff_id', opts.staffId)
    if (opts?.serviceId) q = q.eq('service_id', opts.serviceId)
    if (opts?.from) q = q.gte('scheduled_at', opts.from)
    if (opts?.to) q = q.lt('scheduled_at', opts.to)

    const page = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 50
    const from = (Math.max(1, page) - 1) * pageSize
    const { data, count, error } = await q
      .order('scheduled_at', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error

    const items = (data ?? []).map((r) => toAppointment(r as Row))
    await this.enrichNames(items)

    const total = count ?? 0
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async getById(tenant: TenantContext, id: string): Promise<HarakaAppointment | null> {
    const { data } = await supabaseAdmin
      .from('haraka_appointments')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || (data as Row).organization_id !== tenant.organizationId) return null
    const appointment = toAppointment(data as Row)
    await this.enrichNames([appointment])
    return appointment
  }

  /**
   * Every appointment that could collide with a booking on `staffId` around
   * `aroundIso`. Scanned ±24h because duration lives on the row rather than
   * in an end-time column, so the overlap test has to run in JS
   * (`findConflict`) over a bounded candidate set.
   */
  async findBlockingBookings(
    organizationId: string,
    staffId: string,
    aroundIso: string,
    durationMinutes: number,
  ): Promise<ExistingBooking[]> {
    const start = new Date(aroundIso).getTime()
    const windowStart = new Date(start - 24 * 60 * 60_000).toISOString()
    const windowEnd = new Date(start + durationMinutes * 60_000 + 24 * 60 * 60_000).toISOString()

    const { data, error } = await supabaseAdmin
      .from('haraka_appointments')
      .select('id, scheduled_at, duration_minutes')
      .eq('organization_id', organizationId)
      .eq('staff_id', staffId)
      .in('status', BLOCKING_APPOINTMENT_STATUSES)
      .gte('scheduled_at', windowStart)
      .lte('scheduled_at', windowEnd)
    if (error) throw error

    return (data ?? []).map((r) => {
      const row = r as Row
      return {
        id: row.id as string,
        scheduledAt: new Date(row.scheduled_at as string),
        durationMinutes: Number(row.duration_minutes ?? 0),
      }
    })
  }

  async create(tenant: TenantContext, input: CreateAppointmentInput): Promise<HarakaAppointment> {
    const appointmentNumber = await allocateAppointmentNumber(
      tenant.organizationId,
      tenant.spaceId,
    )
    const taxAmount = money(input.price * (input.taxRate ?? 0))
    const total = money(input.price + taxAmount)

    const { data, error } = await supabaseAdmin
      .from('haraka_appointments')
      .insert({
        organization_id:    tenant.organizationId,
        space_id:           tenant.spaceId ?? null,
        appointment_number: appointmentNumber,
        customer_id:        input.customerId ?? null,
        customer_name:      input.customerName,
        customer_phone:     input.customerPhone ?? null,
        service_id:         input.serviceId,
        staff_id:           input.staffId,
        scheduled_at:       input.scheduledAt,
        duration_minutes:   input.durationMinutes,
        price:              input.price,
        tax_rate:           input.taxRate,
        tax_amount:         taxAmount,
        total,
        status:             'scheduled',
        notes:              input.notes ?? null,
        created_by:         tenant.userId,
        updated_by:         tenant.userId,
      })
      .select('*')
      .single()
    if (error) throw error

    const appointment = toAppointment(data as Row)
    await this.enrichNames([appointment])
    return appointment
  }

  async update(
    tenant: TenantContext,
    id: string,
    patch: UpdateAppointmentInput,
  ): Promise<HarakaAppointment> {
    const update: Row = { updated_by: tenant.userId }
    if (patch.customerName !== undefined) update.customer_name = patch.customerName
    if (patch.customerPhone !== undefined) update.customer_phone = patch.customerPhone
    if (patch.scheduledAt !== undefined) update.scheduled_at = patch.scheduledAt
    if (patch.durationMinutes !== undefined) update.duration_minutes = patch.durationMinutes
    if (patch.staffId !== undefined) update.staff_id = patch.staffId
    if (patch.notes !== undefined) update.notes = patch.notes

    const { data, error } = await supabaseAdmin
      .from('haraka_appointments')
      .update(update)
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error

    const appointment = toAppointment(data as Row)
    await this.enrichNames([appointment])
    return appointment
  }

  async updateStatus(
    tenant: TenantContext,
    id: string,
    status: AppointmentStatus,
  ): Promise<HarakaAppointment> {
    const { data, error } = await supabaseAdmin
      .from('haraka_appointments')
      .update({ status, updated_by: tenant.userId })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    const appointment = toAppointment(data as Row)
    await this.enrichNames([appointment])
    return appointment
  }

  /** Allocates an invoice number on first call; later calls are a no-op so a
   *  double-click can't burn a second number. */
  async generateInvoiceNumber(
    tenant: TenantContext,
    id: string,
  ): Promise<HarakaAppointment> {
    const existing = await this.getById(tenant, id)
    if (!existing) throw new Error('Appointment not found')
    if (existing.invoiceNumber) return existing

    const invoiceNumber = await allocateAppointmentInvoiceNumber(tenant.organizationId)
    const { data, error } = await supabaseAdmin
      .from('haraka_appointments')
      .update({ invoice_number: invoiceNumber, updated_by: tenant.userId })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    const appointment = toAppointment(data as Row)
    await this.enrichNames([appointment])
    return appointment
  }

  async delete(tenant: TenantContext, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('haraka_appointments')
      .delete()
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
  }

  // ── Payments ────────────────────────────────────────────────────────────

  async listPayments(
    tenant: TenantContext,
    appointmentId: string,
  ): Promise<HarakaAppointmentPayment[]> {
    const { data, error } = await supabaseAdmin
      .from('haraka_appointment_payments')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('organization_id', tenant.organizationId)
      .order('paid_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map((r) => toPayment(r as Row))
  }

  /** Recompute amount_paid / payment_status from the payment rows — the ledger
   *  is the source of truth, the appointment columns are a cached rollup. */
  private async recalcPayments(
    tenant: TenantContext,
    appointmentId: string,
  ): Promise<HarakaAppointment> {
    const [payments, appointment] = await Promise.all([
      this.listPayments(tenant, appointmentId),
      this.getById(tenant, appointmentId),
    ])
    if (!appointment) throw new Error('Appointment not found')

    const amountPaid = money(payments.reduce((sum, p) => sum + p.amount, 0))
    const { data, error } = await supabaseAdmin
      .from('haraka_appointments')
      .update({
        amount_paid: amountPaid,
        payment_status: derivePaymentStatus(appointment.total, amountPaid),
        updated_by: tenant.userId,
      })
      .eq('id', appointmentId)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toAppointment(data as Row)
  }

  async addPayment(
    tenant: TenantContext,
    appointmentId: string,
    amount: number,
    paymentMethod: string | null,
    note: string | null,
  ): Promise<HarakaAppointment> {
    const { error } = await supabaseAdmin.from('haraka_appointment_payments').insert({
      appointment_id:  appointmentId,
      organization_id: tenant.organizationId,
      amount,
      payment_method:  paymentMethod,
      note,
      created_by:      tenant.userId,
    })
    if (error) throw error
    return this.recalcPayments(tenant, appointmentId)
  }

  async removePayment(
    tenant: TenantContext,
    appointmentId: string,
    paymentId: string,
  ): Promise<HarakaAppointment> {
    const { error } = await supabaseAdmin
      .from('haraka_appointment_payments')
      .delete()
      .eq('id', paymentId)
      .eq('appointment_id', appointmentId)
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
    return this.recalcPayments(tenant, appointmentId)
  }
}
