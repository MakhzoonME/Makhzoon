import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { eventBus } from '@/lib/platform/events/event-bus'
import { TaxRatesRepository } from './tax-rates.repository'

const repo = new TaxRatesRepository()

function requireSettings(tenant: TenantContext, op: 'taxRates') {
  if (!hasPermission(tenant, 'settings', op)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

/**
 * Read-side access (used by InventoryItemForm dropdown, POS register, Purchases)
 * only needs `inventory.view` since tax rates are reference data shared across
 * those modules — staff who can see items should see tax labels.
 */
function requireInventoryView(tenant: TenantContext) {
  if (!hasPermission(tenant, 'inventory', 'view')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export class TaxRatesService {
  async list(tenant: TenantContext) {
    requireInventoryView(tenant)
    return repo.getAll(tenant)
  }

  async create(tenant: TenantContext, input: { name: string; rate: number; isDefault?: boolean }) {
    requireSettings(tenant, 'taxRates')
    const id = await repo.create(tenant, input)
    auditLog.queue({
      tenant,
      module: 'settings',
      action: 'TAX_RATE_CREATED',
      recordId: id,
      newValue: { name: input.name, rate: input.rate, isDefault: !!input.isDefault },
    })
    await eventBus.emit('taxRate.created', { tenant, id, input })
    return { id }
  }

  async update(
    tenant: TenantContext,
    id: string,
    input: { name?: string; rate?: number; isDefault?: boolean },
  ) {
    requireSettings(tenant, 'taxRates')
    await repo.update(tenant, id, input)
    auditLog.queue({
      tenant,
      module: 'settings',
      action: 'TAX_RATE_UPDATED',
      recordId: id,
      newValue: input as Record<string, unknown>,
    })
    await eventBus.emit('taxRate.updated', { tenant, id, input })
  }

  async delete(tenant: TenantContext, id: string) {
    requireSettings(tenant, 'taxRates')
    await repo.delete(tenant, id)
    auditLog.queue({
      tenant,
      module: 'settings',
      action: 'TAX_RATE_DELETED',
      recordId: id,
    })
    await eventBus.emit('taxRate.deleted', { tenant, id })
  }
}
