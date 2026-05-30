import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { eventBus } from '@/lib/platform/events/event-bus'
import {
  StockAuditRepository,
  type CreateStockAuditInput,
} from '../repositories/stock-audit.repository'
import type { StockAuditAdjustment } from '@/types/stock-audit.types'

const repo = new StockAuditRepository()

function require_(tenant: TenantContext, op: string): void {
  // Stock audits live under the 'inventory' module, same as asset audits.
  if (!hasPermission(tenant, 'inventory', op)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireActiveSubscription(tenant: TenantContext): void {
  if (tenant.subscription && tenant.subscription.status !== 'ACTIVE') {
    throw NextResponse.json({ error: 'Subscription inactive' }, { status: 403 })
  }
}

export class StockAuditService {
  async list(tenant: TenantContext) {
    require_(tenant, 'view')
    return repo.list(tenant)
  }

  async getDetail(tenant: TenantContext, auditId: string) {
    require_(tenant, 'view')
    const audit = await repo.getById(tenant, auditId)
    if (!audit) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    const items = await repo.getItems(auditId)
    return { audit, items }
  }

  async create(tenant: TenantContext, input: CreateStockAuditInput) {
    require_(tenant, 'audits')
    requireActiveSubscription(tenant)
    const id = await repo.create(tenant, input)
    auditLog.queue({
      tenant,
      module: 'inventory',
      action: 'STOCK_AUDIT_STARTED',
      recordId: id,
      newValue: { title: input.title, totalItems: input.itemIds.length },
    })
    await eventBus.emit('inventory.stock-audit.created', { tenant, id })
    return { id }
  }

  async submitItem(
    tenant: TenantContext,
    auditId: string,
    auditItemId: string,
    countedQuantity: number,
    note: string | undefined,
  ) {
    require_(tenant, 'audits')
    await repo.submitItem(tenant, auditId, auditItemId, countedQuantity, note)
  }

  async complete(
    tenant: TenantContext,
    auditId: string,
    adjustments: Record<string, StockAuditAdjustment>,
  ) {
    require_(tenant, 'audits')
    const result = await repo.complete(tenant, auditId, adjustments)
    auditLog.queue({
      tenant,
      module: 'inventory',
      action: 'STOCK_AUDIT_COMPLETED',
      recordId: auditId,
      newValue: { adjustmentsApplied: result.applied },
    })
    await eventBus.emit('inventory.stock-audit.completed', { tenant, id: auditId, result })
    return result
  }
}
