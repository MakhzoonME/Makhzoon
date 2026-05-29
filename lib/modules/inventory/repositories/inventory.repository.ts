import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { InventoryItem, InventoryTransaction, InventoryUnit, StockStatus, TransactionType } from '../types'

type Row = Record<string, unknown>

function stockStatus(qty: number, threshold: number): StockStatus {
  if (qty === 0) return 'out'
  if (qty < threshold) return 'low'
  return 'ok'
}

function toItem(r: Row, computedQty?: number): InventoryItem {
  const qty = computedQty ?? (r.quantity_on_hand as number) ?? 0
  const threshold = (r.minimum_threshold as number) ?? 0
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    name: r.name as string,
    category: r.category as string,
    sku: r.sku as string,
    unit: r.unit as InventoryUnit,
    quantityOnHand: qty,
    minimumThreshold: threshold,
    reorderQuantity: r.reorder_quantity as number,
    location: r.location as string,
    supplier: r.supplier as string,
    unitCost: r.unit_cost as number,
    notes: r.notes as string,
    stockStatus: stockStatus(qty, threshold),
    posEnabled: r.pos_enabled as boolean,
    barcode: (r.barcode as string) ?? null,
    taxRateId: (r.tax_rate_id as string) ?? null,
    posPrice: (r.pos_price as number) ?? null,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: r.created_by as string,
    createdByEmail: r.created_by_email as string,
    createdByName: r.created_by_name as string,
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: r.updated_by as string,
    updatedByEmail: r.updated_by_email as string,
    updatedByName: r.updated_by_name as string,
  }
}

function toTransaction(r: Row): InventoryTransaction {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    itemId: r.item_id as string,
    itemName: r.item_name as string,
    type: r.type as InventoryTransaction['type'],
    quantity: r.quantity as number,
    quantityBefore: r.quantity_before as number,
    quantityAfter: r.quantity_after as number,
    reason: r.reason as string,
    note: r.note as string,
    performedAt: r.performed_at ? new Date(r.performed_at as string) : new Date(),
    performedBy: r.performed_by as string,
    performedByEmail: r.performed_by_email as string,
    performedByName: r.performed_by_name as string,
    performedByRole: r.performed_by_role as string,
  }
}

/** Current on-hand = quantityAfter of the most recent ledger row, else the
 *  item's cached quantity_on_hand. (Quantity is ledger-derived, not stored.) */
async function computeQuantity(itemId: string, fallback: number): Promise<number> {
  const { data } = await supabaseAdmin
    .from('inventory_transactions')
    .select('quantity_after')
    .eq('item_id', itemId)
    .order('performed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return fallback
  return (data.quantity_after as number) ?? fallback
}

type SortField = 'name' | 'category' | 'stockStatus' | 'quantityOnHand' | 'minimumThreshold' | 'location' | 'supplier' | 'unitCost' | 'createdAt'

export interface GetAllOpts {
  category?: string
  stockStatus?: string
  search?: string
  posEnabled?: boolean
  page?: number
  pageSize?: number
  sortBy?: SortField
  sortDir?: 'asc' | 'desc'
}

export class InventoryRepository {
  async getAll(
    tenant: TenantContext,
    opts?: GetAllOpts,
  ): Promise<{ items: InventoryItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 10
    const sortBy = opts?.sortBy ?? 'createdAt'
    const sortDir = opts?.sortDir ?? 'desc'

    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .eq('organization_id', tenant.organizationId)
    if (error) throw error

    let items: InventoryItem[] = (data ?? []).map((r) => toItem(r))

    // Cheap, item-only filters first so we only ledger-look-up what survives.
    if (opts?.category) items = items.filter((i) => i.category === opts.category)
    if (opts?.posEnabled === true) items = items.filter((i) => i.posEnabled === true)
    if (opts?.search) {
      const term = opts.search.toLowerCase()
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(term) ||
          (i.category ?? '').toLowerCase().includes(term) ||
          (i.sku ?? '').toLowerCase().includes(term) ||
          (i.location ?? '').toLowerCase().includes(term),
      )
    }

    // Quantity is ledger-derived. Fetch the latest quantity_after per item in
    // one batched query, then recompute quantityOnHand + stockStatus so the
    // list agrees with the detail page.
    if (items.length > 0) {
      const ids = items.map((i) => i.id)
      const { data: txs } = await supabaseAdmin
        .from('inventory_transactions')
        .select('item_id, quantity_after, performed_at')
        .in('item_id', ids)
        .order('performed_at', { ascending: false })
      const latestQty = new Map<string, number>()
      for (const t of txs ?? []) {
        const k = t.item_id as string
        if (!latestQty.has(k)) latestQty.set(k, (t.quantity_after as number) ?? 0)
      }
      items = items.map((i) => {
        const q = latestQty.get(i.id) ?? i.quantityOnHand
        return { ...i, quantityOnHand: q, stockStatus: stockStatus(q, i.minimumThreshold) }
      })
    }

    if (opts?.stockStatus) {
      // Accepts a single status ('low') or a comma-separated set ('low,out').
      const wanted = new Set(opts.stockStatus.split(',').map((s) => s.trim()).filter(Boolean))
      if (wanted.size > 0) items = items.filter((i) => wanted.has(i.stockStatus))
    }

    const total = items.length
    items.sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]
      const mult = sortDir === 'asc' ? 1 : -1
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return mult
      if (bVal == null) return -mult
      if (aVal instanceof Date && bVal instanceof Date) return (aVal.getTime() - bVal.getTime()) * mult
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * mult
      return String(aVal).localeCompare(String(bVal)) * mult
    })

    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    return { items: items.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages }
  }

  async findByBarcode(tenant: TenantContext, barcode: string): Promise<InventoryItem | null> {
    const { data } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .eq('barcode', barcode)
      .limit(1)
      .maybeSingle()
    if (!data) return null
    const qty = await computeQuantity(data.id as string, (data.quantity_on_hand as number) ?? 0)
    return toItem(data, qty)
  }

  async barcodeExists(tenant: TenantContext, barcode: string, excludeId?: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('inventory_items')
      .select('id')
      .eq('organization_id', tenant.organizationId)
      .eq('barcode', barcode)
      .limit(2)
    if (!data || data.length === 0) return false
    return data.some((d) => (d as Row).id !== excludeId)
  }

  async getById(tenant: TenantContext, id: string): Promise<InventoryItem | null> {
    const { data } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || data.organization_id !== tenant.organizationId) return null
    const qty = await computeQuantity(id, (data.quantity_on_hand as number) ?? 0)
    return toItem(data, qty)
  }

  async getCategories(tenant: TenantContext): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .select('category')
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
    const cats = new Set((data ?? []).map((d) => (d as Row).category as string).filter(Boolean))
    return Array.from(cats).sort()
  }

  async create(
    tenant: TenantContext,
    input: {
      name: string; category: string; sku?: string; unit: string
      quantityOnHand: number; minimumThreshold: number; reorderQuantity?: number
      location?: string; supplier?: string; unitCost?: number; notes?: string
      barcode?: string | null; posEnabled?: boolean; posPrice?: number | null; taxRateId?: string | null
    },
  ): Promise<string> {
    const barcode = input.barcode ? input.barcode.trim() : null
    const { data: item, error } = await supabaseAdmin
      .from('inventory_items')
      .insert({
        organization_id: tenant.organizationId,
        name: input.name,
        category: input.category,
        sku: input.sku ?? null,
        unit: input.unit,
        minimum_threshold: input.minimumThreshold,
        reorder_quantity: input.reorderQuantity ?? null,
        location: input.location ?? null,
        supplier: input.supplier ?? null,
        unit_cost: input.unitCost ?? null,
        notes: input.notes ?? null,
        barcode: barcode || null,
        pos_enabled: input.posEnabled ?? false,
        pos_price: input.posPrice ?? null,
        tax_rate_id: input.taxRateId ?? null,
        // quantity_on_hand intentionally left at default; on-hand is ledger-derived
        created_by: tenant.userId,
        created_by_email: tenant.user.email ?? null,
        created_by_name: tenant.user.displayName ?? null,
        updated_by: tenant.userId,
        updated_by_email: tenant.user.email ?? null,
        updated_by_name: tenant.user.displayName ?? null,
      })
      .select('id')
      .single()
    if (error) throw error
    const id = item.id as string

    if (input.quantityOnHand > 0) {
      const { error: txErr } = await supabaseAdmin.from('inventory_transactions').insert({
        organization_id: tenant.organizationId,
        item_id: id,
        item_name: input.name,
        type: 'in',
        quantity: input.quantityOnHand,
        quantity_before: 0,
        quantity_after: input.quantityOnHand,
        reason: 'Opening balance',
        note: null,
        performed_by: tenant.userId,
        performed_by_email: tenant.user.email ?? null,
        performed_by_name: tenant.user.displayName ?? null,
        performed_by_role: tenant.role ?? null,
      })
      if (txErr) throw txErr
      await supabaseAdmin
        .from('inventory_items')
        .update({ stock_status: stockStatus(input.quantityOnHand, input.minimumThreshold) })
        .eq('id', id)
    }

    return id
  }

  async update(
    tenant: TenantContext,
    id: string,
    input: {
      name?: string; category?: string; sku?: string; unit?: string
      minimumThreshold?: number; reorderQuantity?: number; location?: string
      supplier?: string; unitCost?: number; notes?: string
      barcode?: string | null; posEnabled?: boolean; posPrice?: number | null; taxRateId?: string | null
    },
  ): Promise<void> {
    const current = await this.getById(tenant, id)
    if (!current) throw new Error('Inventory item not found')

    const patch: Row = {
      updated_by: tenant.userId,
      updated_by_email: tenant.user.email ?? null,
      updated_by_name: tenant.user.displayName ?? null,
    }
    const map: Record<string, string> = {
      name: 'name', category: 'category', sku: 'sku', unit: 'unit',
      minimumThreshold: 'minimum_threshold', reorderQuantity: 'reorder_quantity',
      location: 'location', supplier: 'supplier', unitCost: 'unit_cost',
      notes: 'notes', posEnabled: 'pos_enabled', posPrice: 'pos_price',
      taxRateId: 'tax_rate_id',
    }
    for (const [k, col] of Object.entries(map)) {
      const v = (input as Record<string, unknown>)[k]
      if (v !== undefined) patch[col] = v
    }
    if (input.barcode !== undefined) {
      const trimmed = input.barcode ? input.barcode.trim() : ''
      patch.barcode = trimmed || null
    }
    const { error } = await supabaseAdmin
      .from('inventory_items')
      .update(patch)
      .eq('id', id)
    if (error) throw error
  }

  async delete(tenant: TenantContext, id: string): Promise<void> {
    const current = await this.getById(tenant, id)
    if (!current) throw new Error('Inventory item not found')
    const { error } = await supabaseAdmin
      .from('inventory_items')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  async getTransactions(tenant: TenantContext, itemId: string): Promise<InventoryTransaction[]> {
    const item = await this.getById(tenant, itemId)
    if (!item) throw new Error('Inventory item not found')
    const { data, error } = await supabaseAdmin
      .from('inventory_transactions')
      .select('*')
      .eq('item_id', itemId)
      .order('performed_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return (data ?? []).map(toTransaction)
  }

  /**
   * Append a stock movement. Was a Firestore transaction; here it is
   * read-modify-write (compute current qty from the ledger, insert the row,
   * refresh cached stock_status). Acceptable for the internal/staging scope;
   * a SECURITY DEFINER RPC is the hardening path for concurrent stock writes.
   */
  async applyTransaction(
    tenant: TenantContext,
    itemId: string,
    type: TransactionType,
    quantity: number,
    reason: string,
    note?: string,
  ): Promise<{ quantityAfter: number }> {
    const { data: itemRow } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .maybeSingle()
    if (!itemRow || itemRow.organization_id !== tenant.organizationId) {
      throw new Error('Inventory item not found')
    }

    const currentQty = await computeQuantity(itemId, (itemRow.quantity_on_hand as number) ?? 0)
    const minimumThreshold = (itemRow.minimum_threshold as number) ?? 0

    if (type === 'out' && quantity > currentQty) {
      throw new Error('Insufficient stock')
    }

    let newQty: number
    if (type === 'in') newQty = currentQty + quantity
    else if (type === 'out') newQty = currentQty - quantity
    else newQty = quantity

    const { error: txErr } = await supabaseAdmin.from('inventory_transactions').insert({
      organization_id: tenant.organizationId,
      item_id: itemId,
      item_name: itemRow.name,
      type,
      quantity,
      quantity_before: currentQty,
      quantity_after: newQty,
      reason,
      note: note ?? null,
      performed_by: tenant.userId,
      performed_by_email: tenant.user.email ?? null,
      performed_by_name: tenant.user.displayName ?? null,
      performed_by_role: tenant.role ?? null,
    })
    if (txErr) throw txErr

    const { error: upErr } = await supabaseAdmin
      .from('inventory_items')
      .update({
        stock_status: stockStatus(newQty, minimumThreshold),
        updated_by: tenant.userId,
        updated_by_email: tenant.user.email ?? null,
        updated_by_name: tenant.user.displayName ?? null,
      })
      .eq('id', itemId)
    if (upErr) throw upErr

    return { quantityAfter: newQty }
  }
}
