import 'server-only';
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
        space_id: tenant.spaceId,
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
        space_id: tenant.spaceId,
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
   * Record a count for a single audit row. Uses the atomic
   * `submit_stock_audit_item` RPC (migration 0047) which advisory-locks
   * the audit, then atomically updates both the audit-item row and the
   * parent audit's counters (counted_count, pending_count, variance_total)
   * in one DB transaction — preventing counter drift from concurrent submits.
   */
  async submitItem(
    tenant: TenantContext,
    auditId: string,
    auditItemId: string,
    countedQuantity: number,
    note: string | undefined,
  ): Promise<void> {
    // Validate the audit belongs to this tenant before calling the RPC.
    const { data: audit } = await supabaseAdmin
      .from('stock_audits')
      .select('organization_id')
      .eq('id', auditId)
      .maybeSingle()
    if (!audit || audit.organization_id !== tenant.organizationId) throw new Error('Not found')

    const { error } = await supabaseAdmin.rpc('submit_stock_audit_item', {
      p_audit_id:      auditId,
      p_audit_item_id: auditItemId,
      p_counted_qty:   countedQuantity,
      p_note:          note ?? null,
      p_user_id:       tenant.userId,
      p_user_name:     tenant.user.displayName ?? tenant.user.email ?? null,
    })
    if (error) throw error
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
        .select('id, name')
        .eq('id', it.inventoryItemId)
        .maybeSingle()
      if (!itemRow) continue

      // Atomic stock adjustment via the `inventory_apply_stock_adjust` RPC
      // (migration 0047). Row-locks the item before reading current qty and
      // inserting the ledger row — prevents concurrent adjustments from
      // producing incorrect quantity_before/quantity_after.
      const { error: rpcErr } = await supabaseAdmin.rpc('inventory_apply_stock_adjust', {
        p_org:       tenant.organizationId,
        p_space:     tenant.spaceId ?? null,
        p_item:      it.inventoryItemId,
        p_target:    target,
        p_item_name: itemRow.name as string,
        p_reason:    `Stock audit reconcile (${audit.title})`,
        p_note:      it.note ?? null,
        p_by:        tenant.userId,
        p_by_email:  tenant.user.email ?? null,
        p_by_name:   tenant.user.displayName ?? null,
        p_by_role:   tenant.role ?? null,
      })
      if (rpcErr) throw rpcErr

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
