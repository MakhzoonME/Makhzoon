import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import {
  ServiceVehiclesRepository,
  type CreateServiceVehicleInput,
} from './service-vehicles.repository'

const repo = new ServiceVehiclesRepository()

function requireView(tenant: TenantContext) {
  if (!hasPermission(tenant, 'haraka', 'servicesView')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireWrite(tenant: TenantContext) {
  if (!hasPermission(tenant, 'haraka', 'serviceJobsCreate') && !hasPermission(tenant, 'haraka', 'serviceJobsUpdate')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export class ServiceVehiclesService {
  async list(tenant: TenantContext, opts?: { search?: string; customerId?: string }) {
    requireView(tenant)
    return repo.list(tenant, opts)
  }

  async getById(tenant: TenantContext, id: string) {
    requireView(tenant)
    const vehicle = await repo.getById(tenant, id)
    if (!vehicle) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    return vehicle
  }

  /** find-or-create by exact plate match — the core of the intake flow. */
  async findOrCreateByPlate(
    tenant: TenantContext,
    plateNumber: string,
    extra?: Omit<CreateServiceVehicleInput, 'plateNumber'>,
  ) {
    requireWrite(tenant)
    const existing = await repo.findByPlate(tenant, plateNumber)
    if (existing) return { vehicle: existing, isNew: false }
    const vehicle = await repo.create(tenant, { plateNumber, ...extra })
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'SERVICE_JOB_VEHICLE_LINKED',
      recordId: vehicle.id,
      newValue: { plateNumber: vehicle.plateNumber, customerId: vehicle.customerId },
    })
    return { vehicle, isNew: true }
  }

  async create(tenant: TenantContext, input: CreateServiceVehicleInput) {
    requireWrite(tenant)
    const vehicle = await repo.create(tenant, input)
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'SERVICE_JOB_VEHICLE_LINKED',
      recordId: vehicle.id,
      newValue: { plateNumber: vehicle.plateNumber },
    })
    return vehicle
  }

  async update(tenant: TenantContext, id: string, patch: Partial<CreateServiceVehicleInput>) {
    requireWrite(tenant)
    await this.getById(tenant, id)
    return repo.update(tenant, id, patch)
  }
}
