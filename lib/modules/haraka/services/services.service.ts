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
  if (!hasPermission(tenant, 'pos', 'view_services')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

/**
 * POS register lookup (item picker): a cashier who can build a receipt
 * (add_receipt_items) but has no Services-catalog management access should
 * still be able to read the active services list. Full catalog browsing
 * (the default, non-POS-scoped call) still requires view_services.
 */
function requireViewForPosLookup(tenant: TenantContext) {
  if (hasPermission(tenant, 'pos', 'view_services') || hasPermission(tenant, 'pos', 'add_receipt_items')) return
  throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

function requireManage(tenant: TenantContext) {
  if (!hasPermission(tenant, 'pos', 'manage_services')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export class ServicesService {
  async list(tenant: TenantContext, opts?: ListServicesOpts) {
    // A POS lookup for active services (the register's picker) is allowed
    // for anyone who can build a receipt, not just catalog managers.
    if (opts?.active === true) requireViewForPosLookup(tenant)
    else requireView(tenant)
    return repo.list(tenant, opts)
  }

  async getCategories(tenant: TenantContext) {
    requireViewForPosLookup(tenant)
    return repo.getCategories(tenant)
  }

  async getById(tenant: TenantContext, id: string) {
    requireView(tenant)
    const service = await repo.getById(tenant, id)
    if (!service) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    return service
  }

  async create(tenant: TenantContext, input: CreateServiceInput) {
    requireManage(tenant)
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
    requireManage(tenant)
    await this.getById(tenant, id)
    const service = await repo.update(tenant, id, input)
    auditLog.queue({ tenant, module: 'pos', action: 'SERVICE_UPDATED', recordId: id, newValue: input as Record<string, unknown> })
    return service
  }

  async delete(tenant: TenantContext, id: string) {
    requireManage(tenant)
    await this.getById(tenant, id)
    await repo.delete(tenant, id)
    auditLog.queue({ tenant, module: 'pos', action: 'SERVICE_DELETED', recordId: id })
  }
}
