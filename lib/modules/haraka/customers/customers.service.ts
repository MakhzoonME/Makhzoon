import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { eventBus } from '@/lib/platform/events/event-bus'
import {
  CustomersRepository,
  type CustomerInput,
  type CustomerListOpts,
} from './customers.repository'

const repo = new CustomersRepository()

function requirePosSale(tenant: TenantContext) {
  if (!hasPermission(tenant, 'pos', 'process_sale')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export class CustomersService {
  async list(tenant: TenantContext, opts?: CustomerListOpts) {
    requirePosSale(tenant)
    return repo.list(tenant, opts)
  }

  async getById(tenant: TenantContext, id: string) {
    requirePosSale(tenant)
    const customer = await repo.getById(tenant, id)
    if (!customer) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    return customer
  }

  async create(tenant: TenantContext, input: CustomerInput) {
    requirePosSale(tenant)
    const id = await repo.create(tenant, input)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'POS_CUSTOMER_CREATED',
      recordId: id,
      newValue: { name: input.name, phone: input.phone ?? null, email: input.email ?? null },
    })
    await eventBus.emit('pos.customer.created', { tenant, id, input })
    return { id }
  }

  async update(tenant: TenantContext, id: string, input: Partial<CustomerInput>) {
    requirePosSale(tenant)
    await repo.update(tenant, id, input)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'POS_CUSTOMER_UPDATED',
      recordId: id,
      newValue: input as Record<string, unknown>,
    })
    await eventBus.emit('pos.customer.updated', { tenant, id, input })
  }

  async delete(tenant: TenantContext, id: string) {
    requirePosSale(tenant)
    await repo.delete(tenant, id)
    auditLog.queue({ tenant, module: 'pos', action: 'POS_CUSTOMER_DELETED', recordId: id })
    await eventBus.emit('pos.customer.deleted', { tenant, id })
  }
}
