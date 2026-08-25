import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import {
  ServicesRepository,
  type ListServicesOpts,
  type CreateServiceInput,
  type UpdateServiceInput,
} from './services.repository'

const repo = new ServicesRepository()

function requireView(tenant: TenantContext) {
  if (!hasPermission(tenant, 'haraka', 'serviceCatalogView')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

/**
 * Active-services lookup (e.g. the Appointments booking picker, or the
 * Service Jobs/Retainers catalog picker): a staff member who can use those
 * flows but has no Services-catalog management access should still be able
 * to read the active services list. Full catalog browsing (the default,
 * non-scoped call) still requires serviceCatalogView. Services are no
 * longer sold through the POS register, so registerOpen no longer grants
 * this lookup.
 */
function requireViewForActiveLookup(tenant: TenantContext) {
  if (
    hasPermission(tenant, 'haraka', 'serviceCatalogView') ||
    hasPermission(tenant, 'haraka', 'appointmentsView')
  ) return
  throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

function requireOp(tenant: TenantContext, op: 'serviceCatalogCreate' | 'serviceCatalogUpdate' | 'serviceCatalogDelete') {
  if (!hasPermission(tenant, 'haraka', op)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export class ServicesService {
  async list(tenant: TenantContext, opts?: ListServicesOpts) {
    // An active-services lookup (e.g. the Appointments booking picker) is
    // allowed for anyone who can use those flows, not just catalog managers.
    if (opts?.active === true) requireViewForActiveLookup(tenant)
    else requireView(tenant)
    return repo.list(tenant, opts)
  }

  async getCategories(tenant: TenantContext) {
    requireViewForActiveLookup(tenant)
    return repo.getCategories(tenant)
  }

  async getById(tenant: TenantContext, id: string) {
    requireView(tenant)
    const service = await repo.getById(tenant, id)
    if (!service) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    return service
  }

  async create(tenant: TenantContext, input: CreateServiceInput) {
    requireOp(tenant, 'serviceCatalogCreate')
    const service = await repo.create(tenant, input)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'SERVICE_CREATED',
      recordId: service.id,
      newValue: { name: service.name, price: service.price },
    })
    return service
  }

  async update(tenant: TenantContext, id: string, input: UpdateServiceInput) {
    requireOp(tenant, 'serviceCatalogUpdate')
    await this.getById(tenant, id)
    const service = await repo.update(tenant, id, input)
    auditLog.queue({ tenant, module: 'pos', action: 'SERVICE_UPDATED', recordId: id, newValue: input as Record<string, unknown> })
    return service
  }

  async delete(tenant: TenantContext, id: string) {
    requireOp(tenant, 'serviceCatalogDelete')
    await this.getById(tenant, id)
    await repo.delete(tenant, id)
    auditLog.queue({ tenant, module: 'pos', action: 'SERVICE_DELETED', recordId: id })
  }
}
