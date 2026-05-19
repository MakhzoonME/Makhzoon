import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { eventBus } from '@/lib/platform/events/event-bus'
import {
  PurchasesRepository,
  type ListOpts,
  type PurchaseInput,
} from './purchases.repository'

const repo = new PurchasesRepository()

function require(tenant: TenantContext, op: 'view' | 'create' | 'update' | 'delete' | 'receive') {
  if (!hasPermission(tenant, 'purchases', op)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireActiveSubscription(tenant: TenantContext) {
  if (tenant.subscription && tenant.subscription.status !== 'ACTIVE') {
    throw NextResponse.json({ error: 'Subscription inactive' }, { status: 403 })
  }
}

export class PurchasesService {
  async list(tenant: TenantContext, opts?: ListOpts) {
    require(tenant, 'view')
    return repo.list(tenant, opts)
  }

  async getById(tenant: TenantContext, id: string) {
    require(tenant, 'view')
    const p = await repo.getById(tenant, id)
    if (!p) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    return p
  }

  async create(tenant: TenantContext, input: PurchaseInput) {
    require(tenant, 'create')
    requireActiveSubscription(tenant)
    const id = await repo.create(tenant, input)
    auditLog.queue({
      tenant,
      module: 'inventory',
      action: 'PURCHASE_CREATED',
      recordId: id,
      newValue: {
        supplierName: input.supplierName,
        invoiceNumber: input.invoiceNumber ?? null,
        lineCount: input.lines.length,
      },
    })
    await eventBus.emit('inventory.purchase.created', { tenant, id })
    return { id }
  }

  async update(tenant: TenantContext, id: string, input: Partial<PurchaseInput>) {
    require(tenant, 'update')
    await repo.update(tenant, id, input)
    auditLog.queue({
      tenant,
      module: 'inventory',
      action: 'PURCHASE_UPDATED',
      recordId: id,
      newValue: input as Record<string, unknown>,
    })
    await eventBus.emit('inventory.purchase.updated', { tenant, id })
  }

  async delete(tenant: TenantContext, id: string) {
    require(tenant, 'delete')
    await repo.delete(tenant, id)
    auditLog.queue({
      tenant,
      module: 'inventory',
      action: 'PURCHASE_DELETED',
      recordId: id,
    })
    await eventBus.emit('inventory.purchase.deleted', { tenant, id })
  }

  async cancel(tenant: TenantContext, id: string) {
    require(tenant, 'update')
    await repo.cancel(tenant, id)
    auditLog.queue({
      tenant,
      module: 'inventory',
      action: 'PURCHASE_CANCELLED',
      recordId: id,
    })
    await eventBus.emit('inventory.purchase.cancelled', { tenant, id })
  }

  async receive(tenant: TenantContext, id: string) {
    require(tenant, 'receive')
    const results = await repo.receive(tenant, id)
    auditLog.queue({
      tenant,
      module: 'inventory',
      action: 'PURCHASE_RECEIVED',
      recordId: id,
      newValue: {
        items: results.map((r) => ({ itemId: r.itemId, quantityAfter: r.quantityAfter })),
      },
    })
    await eventBus.emit('inventory.purchase.received', { tenant, id, results })
    return { results }
  }
}
