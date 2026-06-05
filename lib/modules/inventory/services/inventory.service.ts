import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { notificationQueue } from '@/lib/notifications/notification-queue'
import { eventBus } from '@/lib/platform/events/event-bus'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { InventoryRepository, GetAllOpts } from '../repositories/inventory.repository'
import type { TransactionType } from '../types'

const repo = new InventoryRepository()

function requirePermission(tenant: TenantContext, module: 'inventory', operation: string): void {
  if (!hasPermission(tenant, module, operation)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireActiveSubscription(tenant: TenantContext): void {
  if (tenant.subscription && tenant.subscription.status !== 'ACTIVE') {
    throw NextResponse.json({ error: 'Subscription inactive' }, { status: 403 })
  }
}

export class InventoryService {
  async getAll(tenant: TenantContext, opts?: GetAllOpts) {
    requirePermission(tenant, 'inventory', 'view')
    return repo.getAll(tenant, opts)
  }

  async getCategories(tenant: TenantContext) {
    requirePermission(tenant, 'inventory', 'view')
    return repo.getCategories(tenant)
  }

  async getById(tenant: TenantContext, id: string) {
    requirePermission(tenant, 'inventory', 'view')
    const item = await repo.getById(tenant, id)
    if (!item) {
      throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return item
  }

  /**
   * Resolve a barcode to an inventory item within the caller's organization.
   * Returns null on miss so the caller (POS register, purchase line editor)
   * can offer a "create new item" fallback. Requires only `inventory.view`.
   */
  async findByBarcode(tenant: TenantContext, barcode: string) {
    requirePermission(tenant, 'inventory', 'view')
    const code = barcode.trim()
    if (!code) return null
    return repo.findByBarcode(tenant, code)
  }

  private async ensureBarcodeUnique(
    tenant: TenantContext,
    barcode: string | null | undefined,
    excludeId?: string,
  ) {
    if (!barcode) return
    const code = barcode.trim()
    if (!code) return
    const taken = await repo.barcodeExists(tenant, code, excludeId)
    if (taken) {
      throw NextResponse.json(
        { error: 'Barcode already used by another item in this organization' },
        { status: 409 },
      )
    }
  }

  async create(
    tenant: TenantContext,
    input: {
      name: string
      category: string
      sku?: string
      unit: string
      quantityOnHand: number
      minimumThreshold: number
      reorderQuantity?: number
      location?: string
      supplier?: string
      unitCost?: number
      notes?: string
      barcode?: string | null
      posEnabled?: boolean
      posPrice?: number | null
      taxRateId?: string | null
      expiryDate?: string | null
      documents?: import('@/types').DocumentRef[]
    }
  ) {
    requirePermission(tenant, 'inventory', 'create')
    requireActiveSubscription(tenant)

    await this.ensureBarcodeUnique(tenant, input.barcode)

    const id = await repo.create(tenant, input)

    auditLog.queue({
      tenant,
      module: 'inventory',
      action: 'INVENTORY_ITEM_CREATED',
      recordId: id,
      newValue: { name: input.name, category: input.category, quantityOnHand: input.quantityOnHand },
    })

    await eventBus.emit('inventory.item.created', { tenant, id, input })

    return { id }
  }

  async update(
    tenant: TenantContext,
    id: string,
    input: {
      name?: string
      category?: string
      sku?: string
      unit?: string
      minimumThreshold?: number
      reorderQuantity?: number
      location?: string
      supplier?: string
      unitCost?: number
      notes?: string
      barcode?: string | null
      posEnabled?: boolean
      posPrice?: number | null
      taxRateId?: string | null
      expiryDate?: string | null
      documents?: import('@/types').DocumentRef[]
    }
  ) {
    requirePermission(tenant, 'inventory', 'update')
    if (input.barcode !== undefined) {
      await this.ensureBarcodeUnique(tenant, input.barcode, id)
    }
    await repo.update(tenant, id, input)

    auditLog.queue({
      tenant,
      module: 'inventory',
      action: 'INVENTORY_ITEM_UPDATED',
      recordId: id,
      newValue: input as Record<string, unknown>,
    })

    await eventBus.emit('inventory.item.updated', { tenant, id, input })
  }

  async delete(tenant: TenantContext, id: string) {
    requirePermission(tenant, 'inventory', 'delete')

    // Cross-module reference integrity — block deletion while live references exist.
    const now = new Date().toISOString()

    const [openReqs, activeWarranties] = await Promise.all([
      supabaseAdmin
        .from('requests')
        .select('id')
        .eq('organization_id', tenant.organizationId)
        .eq('inventory_item_id', id)
        .eq('status', 'PENDING')
        .limit(1),
      supabaseAdmin
        .from('warranties')
        .select('id')
        .eq('organization_id', tenant.organizationId)
        .eq('inventory_item_id', id)
        .gte('end_date', now)
        .limit(1),
    ])

    if ((openReqs.data?.length ?? 0) > 0) {
      throw NextResponse.json(
        {
          error: 'Cannot delete inventory item with open requests. Resolve or reject them first.',
          code: 'INVENTORY_DELETE_OPEN_REQUESTS',
        },
        { status: 409 },
      )
    }
    if ((activeWarranties.data?.length ?? 0) > 0) {
      throw NextResponse.json(
        {
          error: 'Cannot delete inventory item with an active warranty. Delete or let the warranty expire first.',
          code: 'INVENTORY_DELETE_ACTIVE_WARRANTY',
        },
        { status: 409 },
      )
    }

    await repo.delete(tenant, id)

    auditLog.queue({
      tenant,
      module: 'inventory',
      action: 'INVENTORY_ITEM_DELETED',
      recordId: id,
    })

    await eventBus.emit('inventory.item.deleted', { tenant, id })
  }

  async getTransactions(tenant: TenantContext, itemId: string) {
    requirePermission(tenant, 'inventory', 'view')
    return repo.getTransactions(tenant, itemId)
  }

  async applyTransaction(
    tenant: TenantContext,
    itemId: string,
    type: TransactionType,
    quantity: number,
    reason: string,
    note?: string
  ) {
    requirePermission(tenant, 'inventory', 'update')
    const result = await repo.applyTransaction(tenant, itemId, type, quantity, reason, note)

    auditLog.queue({
      tenant,
      module: 'inventory',
      action: 'INVENTORY_TRANSACTION_CREATED',
      recordId: itemId,
      newValue: { type, quantity, reason, quantityAfter: result.quantityAfter },
    })

    await eventBus.emit('inventory.transaction.created', { tenant, itemId, type, quantity, reason, result })

    // Fire stock alerts after OUT transactions — fetch item metadata for the notification title
    if (type === 'out') {
      const after = Number(result.quantityAfter);
      // Async but fire-and-forget — never blocks the caller
      (async () => {
        try {
          const { data: item } = await supabaseAdmin
            .from('inventory_items')
            .select('name, minimum_threshold')
            .eq('id', itemId)
            .maybeSingle()
          const itemName  = (item?.name as string) ?? itemId
          const threshold = Number(item?.minimum_threshold ?? 0)
          if (after === 0) {
            notificationQueue.enqueue({
              tenant,
              eventType: 'inventory.out_of_stock',
              data: { itemId, itemName },
              link: `/raseed/${itemId}`,
              titleOverride: `${itemName} is out of stock`,
            })
          } else if (after <= threshold) {
            notificationQueue.enqueue({
              tenant,
              eventType: 'inventory.low_stock',
              data: { itemId, itemName, quantityOnHand: after, minimumThreshold: threshold },
              link: `/raseed/${itemId}`,
              titleOverride: `${itemName} stock is low (${after} remaining)`,
            })
          }
        } catch {
          // never surface to caller
        }
      })()
    }

    return result
  }
}
