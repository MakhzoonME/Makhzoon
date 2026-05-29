import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type {
  StockAudit,
  StockAuditAdjustment,
  StockAuditItem,
} from '@/types/stock-audit.types'

type Row = Record<string, unknown>

function toAudit(r: Row): StockAudit {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    title: r.title as string,
    notes: (r.notes as string) ?? undefined,
    status: r.status as StockAudit['status'],
    totalItems: Number(r.total_items ?? 0),
    countedCount: Number(r.counted_count ?? 0),
    pendingCount: Number(r.pending_count ?? 0),
    varianceTotal: Number(r.variance_total ?? 0),
    startedBy: (r.started_by as string) ?? undefined,
    startedByName: (r.started_by_name as string) ?? undefined,
    completedAt: r.completed_at ? new Date(r.completed_at as string) : undefined,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
  }
}

function toItem(r: Row): StockAuditItem {
  const counted = r.counted_quantity == null ? undefined : Number(r.counted_quantity)
  return {
    id: r.id as string,
    auditId: r.audit_id as string,
    organizationId: r.organization_id as string,
    inventoryItemId: (r.inventory_item_id as string) ?? undefined,
    itemName: r.item_name as string,
    itemSku: (r.item_sku as string) ?? undefined,
    itemUnit: (r.item_unit as string) ?? undefined,
    itemCategory: (r.item_category as string) ?? undefined,
    itemLocation: (r.item_location as string) ?? undefined,
    expectedQuantity: Number(r.expected_quantity ?? 0),
    countedQuantity: counted,
    note: (r.note as string) ?? undefined,
    status: r.status as StockAuditItem['status'],
    checkedAt: r.checked_at ? new Date(r.checked_at as string) : undefined,
    checkedBy: (r.checked_by as string) ?? undefined,
    checkedByName: (r.checked_by_name as string) ?? undefined,
  }
}

/** Latest ledger qty for an item, falling back to the cached on-hand. */
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

export interface CreateStockAuditInput {
  title: string
  notes?: string
  itemIds: string[]
}

export class StockAuditRepository {
  async list(tenant: TenantContext): Promise<StockAudit[]> {
    const { data, error } = await supabaseAdmin
      .from('stock_audits')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return (data ?? []).map(toAudit)
  }

  async getById(tenant: TenantContext, id: string): Promise<StockAudit | null> {
    const { data } = await supabaseAdmin
      .from('stock_audits')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || data.organization_id !== tenant.organizationId) return null
    return toAudit(data)
  }

  async getItems(auditId: string): Promise<StockAuditItem[]> {
    const { data, error } = await supabaseAdmin
      .from('stock_audit_items')
      .select('*')
      .eq('audit_id', auditId)
      .order('item_name', { ascending: true })
    if (error) throw error
    return (data ?? []).map(toItem)
  }

  /**
   * Snapshot expected qty per item from the ledger and insert the audit
   * along with its rows. Items missing or in another org are silently skipped.
   */
  async create(tenant: TenantContext, input: CreateStockAuditInput): Promise<string> {
    const ids = Array.from(new Set(input.itemIds)).filter(Boolean)
    if (ids.length === 0) throw new Error('itemIds is empty')

    const { data: itemRows, error: itemErr } = await supabaseAdmin
      .from('inventory_items')
      .select('id, name, sku, unit, category, location, quantity_on_hand')
      .eq('organization_id', tenant.organizationId)
      .in('id', ids)
    if (itemErr) throw itemErr
    const items = itemRows ?? []
    if (items.length === 0) throw new Error('No matching inventory items')

    // Snapshot ledger qty per item, in one batch
    const itemIdsFound = items.map((i) => i.id as string)
    const { data: txs } = await supabaseAdmin
      .from('inventory_transactions')
      .select('item_id, quantity_after, performed_at')
      .in('item_id', itemIdsFound)
      .order('performed_at', { ascending: false })
    const latestQty = new Map<string, number>()
    for (const t of txs ?? []) {
      const k = t.item_id as string
      if (!latestQty.has(k)) latestQty.set(k, (t.quantity_after as number) ?? 0)
    }

    const total = items.length
    const { data: audit, error } = await supabaseAdmin
      .from('stock_audits')
      .insert({
        organization_id: tenant.organizationId,
        title: input.title,
        notes: input.notes ?? null,
        status: 'in_progress',
        total_items: total,
        counted_count: 0,
        pending_count: total,
        variance_total: 0,
        started_by: tenant.userId,
        started_by_name: tenant.user.displayName ?? tenant.user.email ?? null,
        created_by: tenant.userId,
        updated_by: tenant.userId,
      })
      .select('id')
      .single()
    if (error) throw error
    const auditId = audit.id as string

    const rows = items.map((it) => {
      const id = it.id as string
      const expected = latestQty.get(id) ?? (it.quantity_on_hand as number) ?? 0
      return {
        audit_id: auditId,
        organization_id: tenant.organizationId,
        inventory_item_id: id,
        item_name: it.name as string,
        item_sku: (it.sku as string) ?? null,
        item_unit: (it.unit as string) ?? null,
        item_category: (it.category as string) ?? null,
        item_location: (it.location as string) ?? null,
        expected_quantity: expected,
        counted_quantity: null,
        note: null,
        status: 'pending',
      }
    })
    const { error: insertErr } = await supabaseAdmin
      .from('stock_audit_items')
      .insert(rows)
    if (insertErr) throw insertErr

    return auditId
  }

  /**
   * Record a count for a single audit row. Updates audit counters
   * (counted, pending, varianceTotal). Was a Firestore txn — RMW here is
   * acceptable for our scope; harden via RPC later.
   */
  async submitItem(
    tenant: TenantContext,
    auditId: string,
    auditItemId: string,
    countedQuantity: number,
    note: string | undefined,
  ): Promise<void> {
    const [{ data: item }, { data: audit }] = await Promise.all([
      supabaseAdmin
        .from('stock_audit_items')
        .select('status, expected_quantity, counted_quantity')
        .eq('id', auditItemId)
        .maybeSingle(),
      supabaseAdmin
        .from('stock_audits')
        .select('counted_count, pending_count, variance_total, status, organization_id')
        .eq('id', auditId)
        .maybeSingle(),
    ])
    if (!item || !audit) throw new Error('Not found')
    if (audit.organization_id !== tenant.organizationId) throw new Error('Not found')
    if (audit.status === 'completed') throw new Error('Audit already completed')

    const expected = Number(item.expected_quantity ?? 0)
    const prevCounted = item.counted_quantity == null ? null : Number(item.counted_quantity)
    const wasCounted = item.status === 'counted'

    const newCountedCount = Number(audit.counted_count ?? 0) + (wasCounted ? 0 : 1)
    const newPendingCount = Number(audit.pending_count ?? 0) + (wasCounted ? 0 : -1)

    const prevAbs = wasCounted && prevCounted != null ? Math.abs(prevCounted - expected) : 0
    const nextAbs = Math.abs(countedQuantity - expected)
    const newVariance = Number(audit.variance_total ?? 0) - prevAbs + nextAbs

    const now = new Date().toISOString()
    const { error: itemErr } = await supabaseAdmin
      .from('stock_audit_items')
      .update({
        counted_quantity: countedQuantity,
        note: note ?? null,
        status: 'counted',
        checked_at: now,
        checked_by: tenant.userId,
        checked_by_name: tenant.user.displayName ?? tenant.user.email ?? null,
      })
      .eq('id', auditItemId)
    if (itemErr) throw itemErr

    const { error: auditErr } = await supabaseAdmin
      .from('stock_audits')
      .update({
        counted_count: newCountedCount,
        pending_count: newPendingCount,
        variance_total: newVariance,
        updated_by: tenant.userId,
      })
      .eq('id', auditId)
    if (auditErr) throw auditErr
  }

  /**
   * Complete the audit, optionally writing `adjust` ledger rows per item
   * according to `adjustments`. For each row whose decision is `apply`,
   * we insert an `adjustment` setting on-hand to the counted qty. A numeric
   * override does the same but with a caller-supplied target. `skip` and any
   * missing key are no-ops.
   */
  async complete(
    tenant: TenantContext,
    auditId: string,
    adjustments: Record<string, StockAuditAdjustment>,
  ): Promise<{ applied: number }> {
    const audit = await this.getById(tenant, auditId)
    if (!audit) throw new Error('Not found')
    if (audit.status === 'completed') throw new Error('Audit already completed')

    const items = await this.getItems(auditId)
    let applied = 0

    for (const it of items) {
      const decision = adjustments[it.id]
      if (decision === undefined || decision === 'skip') continue
      if (!it.inventoryItemId) continue

      // Resolve the target qty: either the counted value (apply) or a numeric override.
      let target: number | null = null
      if (decision === 'apply') {
        if (it.countedQuantity == null) continue
        target = it.countedQuantity
      } else if (typeof decision === 'number' && !Number.isNaN(decision)) {
        target = decision
      } else {
        continue
      }

      const { data: itemRow } = await supabaseAdmin
        .from('inventory_items')
        .select('quantity_on_hand, minimum_threshold, name')
        .eq('id', it.inventoryItemId)
        .maybeSingle()
      if (!itemRow) continue
      const current = await computeQuantity(
        it.inventoryItemId,
        (itemRow.quantity_on_hand as number) ?? 0,
      )
      if (current === target) continue

      const { error: txErr } = await supabaseAdmin
        .from('inventory_transactions')
        .insert({
          organization_id: tenant.organizationId,
          item_id: it.inventoryItemId,
          item_name: itemRow.name as string,
          type: 'adjustment',
          quantity: target,
          quantity_before: current,
          quantity_after: target,
          reason: `Stock audit reconcile (${audit.title})`,
          note: it.note ?? null,
          performed_by: tenant.userId,
          performed_by_email: tenant.user.email ?? null,
          performed_by_name: tenant.user.displayName ?? null,
          performed_by_role: tenant.role ?? null,
        })
      if (txErr) throw txErr

      const threshold = (itemRow.minimum_threshold as number) ?? 0
      const status = target === 0 ? 'out' : target < threshold ? 'low' : 'ok'
      await supabaseAdmin
        .from('inventory_items')
        .update({
          stock_status: status,
          updated_by: tenant.userId,
          updated_by_email: tenant.user.email ?? null,
          updated_by_name: tenant.user.displayName ?? null,
        })
        .eq('id', it.inventoryItemId)

      applied += 1
    }

    const { error } = await supabaseAdmin
      .from('stock_audits')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_by: tenant.userId,
      })
      .eq('id', auditId)
    if (error) throw error

    return { applied }
  }
}
