import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasVerticalPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { StaffRepository, type CreateStaffInput, type ListStaffOpts } from './staff.repository'
import {
  StaffAvailabilityRepository,
  type CreateAvailabilityInput,
  type CreateAvailabilityExceptionInput,
} from './availability.repository'

const repo = new StaffRepository()
const availabilityRepo = new StaffAvailabilityRepository()

// The directory itself keeps the delivery-agent permission keys — this is a
// rename, not a re-authorization, so anyone who could manage delivery agents
// before can manage the same records now.
function requireOp(
  tenant: TenantContext,
  op: 'deliveryAgentsCreate' | 'deliveryAgentsUpdate' | 'deliveryAgentsDelete',
) {
  if (!hasVerticalPermission(tenant, op)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

// Reading the directory is what the Appointments provider picker needs, so
// appointmentsView grants it too — otherwise a receptionist who can book but
// doesn't manage delivery agents couldn't see any providers.
function requireView(tenant: TenantContext) {
  if (
    hasVerticalPermission(tenant, 'deliveryAgentsView') ||
    hasVerticalPermission(tenant, 'appointmentsView')
  ) return
  throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/** Capability tags decide which modules a person can be assigned to, so
 *  editing them is gated separately from plain name/phone edits. */
function requireCapabilityManage(tenant: TenantContext) {
  if (!hasVerticalPermission(tenant, 'staffManage')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireAvailabilityManage(tenant: TenantContext) {
  if (!hasVerticalPermission(tenant, 'staffAvailabilityManage')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export class StaffService {
  async list(tenant: TenantContext, opts: ListStaffOpts = {}) {
    requireView(tenant)
    return repo.list(tenant, opts)
  }

  async getById(tenant: TenantContext, id: string) {
    requireView(tenant)
    const staff = await repo.getById(tenant, id)
    if (!staff) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    return staff
  }

  async create(tenant: TenantContext, input: CreateStaffInput) {
    requireOp(tenant, 'deliveryAgentsCreate')
    // Anything beyond the plain delivery default is a capability grant.
    const wantsNonDefault =
      !!input.capabilities &&
      (input.capabilities.length !== 1 || input.capabilities[0] !== 'delivery')
    if (wantsNonDefault) requireCapabilityManage(tenant)

    const staff = await repo.create(tenant, input)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'STAFF_CREATED',
      recordId: staff.id,
      newValue: { name: staff.name, capabilities: staff.capabilities },
    })
    return staff
  }

  async update(tenant: TenantContext, id: string, patch: Partial<CreateStaffInput>) {
    requireOp(tenant, 'deliveryAgentsUpdate')
    if (patch.capabilities !== undefined) requireCapabilityManage(tenant)
    await this.getById(tenant, id)
    const staff = await repo.update(tenant, id, patch)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'STAFF_UPDATED',
      recordId: id,
      newValue: patch,
    })
    return staff
  }

  async delete(tenant: TenantContext, id: string) {
    requireOp(tenant, 'deliveryAgentsDelete')
    await this.getById(tenant, id)
    try {
      await repo.delete(tenant, id)
    } catch (err) {
      if (err instanceof Error && err.message === 'STAFF_HAS_LINKED_RECORDS') {
        throw NextResponse.json(
          {
            error:
              'This worker has appointments on record and can\'t be deleted. Mark them inactive instead to hide them from new bookings.',
          },
          { status: 400 },
        )
      }
      throw err
    }
    auditLog.queue({ tenant, module: 'pos', action: 'STAFF_DELETED', recordId: id })
  }

  // ── Availability ────────────────────────────────────────────────────────

  async listAvailability(tenant: TenantContext, staffId: string) {
    requireView(tenant)
    await this.getById(tenant, staffId)
    const [weekly, exceptions] = await Promise.all([
      availabilityRepo.listWeekly(tenant, staffId),
      availabilityRepo.listExceptions(tenant, staffId),
    ])
    return { weekly, exceptions }
  }

  async addAvailability(tenant: TenantContext, staffId: string, input: CreateAvailabilityInput) {
    requireAvailabilityManage(tenant)
    const staff = await this.getById(tenant, staffId)
    if (!staff.capabilities.includes('appointment_provider')) {
      throw NextResponse.json(
        { error: 'Working hours only apply to staff tagged as appointment providers' },
        { status: 400 },
      )
    }
    const row = await availabilityRepo.createWeekly(tenant, staffId, input)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'STAFF_AVAILABILITY_ADDED',
      recordId: staffId,
      newValue: { dayOfWeek: input.dayOfWeek, startTime: input.startTime, endTime: input.endTime },
    })
    return row
  }

  async removeAvailability(tenant: TenantContext, staffId: string, id: string) {
    requireAvailabilityManage(tenant)
    await this.getById(tenant, staffId)
    await availabilityRepo.deleteWeekly(tenant, staffId, id)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'STAFF_AVAILABILITY_REMOVED',
      recordId: staffId,
      newValue: { availabilityId: id },
    })
  }

  async upsertAvailabilityException(
    tenant: TenantContext,
    staffId: string,
    input: CreateAvailabilityExceptionInput,
  ) {
    requireAvailabilityManage(tenant)
    await this.getById(tenant, staffId)
    const row = await availabilityRepo.upsertException(tenant, staffId, input)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'STAFF_AVAILABILITY_EXCEPTION_SET',
      recordId: staffId,
      newValue: { date: input.exceptionDate, startTime: input.startTime, endTime: input.endTime },
    })
    return row
  }

  async removeAvailabilityException(tenant: TenantContext, staffId: string, id: string) {
    requireAvailabilityManage(tenant)
    await this.getById(tenant, staffId)
    await availabilityRepo.deleteException(tenant, staffId, id)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'STAFF_AVAILABILITY_EXCEPTION_REMOVED',
      recordId: staffId,
      newValue: { exceptionId: id },
    })
  }
}
