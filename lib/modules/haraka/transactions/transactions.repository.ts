import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { PosLineItem, PosPayment, PosTransaction } from '@/types'
import { priceCart, computeChange, type CartLineInput } from '@/lib/modules/haraka/pricing/calc'

type Row = Record<string, unknown>

function toLine(d: Row): PosLineItem {
  return {
    inventoryItemId: d.inventoryItemId as string,
    inventoryItemName: d.inventoryItemName as string,
    sku: (d.sku as string) ?? null,
    barcode: (d.barcode as string) ?? null,
    quantity: Number(d.quantity ?? 0),
    unitPrice: Number(d.unitPrice ?? 0),
    taxRateId: (d.taxRateId as string) ?? null,
    taxRate: Number(d.taxRate ?? 0),
    taxAmount: Number(d.taxAmount ?? 0),
    discountAmount: Number(d.discountAmount ?? 0),
    lineTotal: Number(d.lineTotal ?? 0),
  }
}

function toPayment(d: Row): PosPayment {
  return {
    method: d.method as PosPayment['method'],
    amount: Number(d.amount ?? 0),
    reference: (d.reference as string) ?? null,
    cardLast4: (d.cardLast4 as string) ?? null,
  }
}

function toTransaction(r: Row): PosTransaction {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    sessionId: r.session_id as string,
    locationId: (r.location_id as string) ?? 'default',
    cashierId: r.cashier_id as string,
    cashierName: (r.cashier_name as string) ?? '',
    customerId: (r.customer_id as string) ?? null,
    customerName: (r.customer_name as string) ?? null,
    items: Array.isArray(r.items) ? (r.items as Row[]).map(toLine) : [],
    subtotal: Number(r.subtotal ?? 0),
    taxAmount: Number(r.tax_amount ?? 0),
    discountAmount: Number(r.discount_amount ?? 0),
    total: Number(r.total ?? 0),
    payments: Array.isArray(r.payments) ? (r.payments as Row[]).map(toPayment) : [],
    change: Number(r.change ?? 0),
    status: (r.status as PosTransaction['status']) ?? 'completed',
    receiptNumber: (r.receipt_number as string) ?? '',
    offlineId: (r.offline_id as string) ?? '',
    syncedAt: r.synced_at ? new Date(r.synced_at as string) : null,
    parentTransactionId: (r.parent_transaction_id as string) ?? null,
    fawtara: (r.fawtara as PosTransaction['fawtara']) ?? null,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
  }
}

export interface CompleteSaleInput {
  sessionId: string
  customerId?: string | null
  customerName?: string | null
  lines: CartLineInput[]
  payments: Array<{ method: 'cash' | 'card' | 'other'; amount: number; reference?: string | null; cardLast4?: string | null }>
  offlineId: string
  skipFawtara?: boolean
}

interface ListOpts {
  sessionId?: string
  status?: 'completed' | 'refunded' | 'voided'
  page?: number
  pageSize?: number
}

export type AggregateGroupBy = 'day' | 'item' | 'cashier' | 'paymentMethod' | 'session'

export interface AggregateOpts {
  from?: Date
  to?: Date
  groupBy: AggregateGroupBy
  topN?: number
}

export interface AggregateBucket {
  key: string
  label: string
  count: number
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  quantity?: number
}

export interface AggregateResult {
  groupBy: AggregateGroupBy
  from: Date
  to: Date
  buckets: AggregateBucket[]
  totals: { transactions: number; subtotal: number; taxAmount: number; discountAmount: number; total: number }
}

/**
 * Allocate the next per-org receipt number. Was a Firestore transaction;
 * read-modify-write on the single pos_receipt_counters row — acceptable for
 * the internal/staging scope (harden via an RPC for concurrent registers).
 */
async function allocateReceiptNumber(orgId: string, spaceId?: string): Promise<string> {
  // Receipt counter is per-space (each branch has its own sequence). For
  // backward compatibility before Script 3 runs, when spaceId is absent we
  // fall back to a single org-wide row (legacy behavior).
  let readQ = supabaseAdmin
    .from('pos_receipt_counters')
    .select('last_receipt_number')
    .eq('organization_id', orgId)
  if (spaceId) readQ = readQ.eq('space_id', spaceId)
  const { data } = await readQ.maybeSingle()
  const next = (data ? Number(data.last_receipt_number ?? 0) : 0) + 1
  const { error } = await supabaseAdmin.from('pos_receipt_counters').upsert(
    {
      organization_id: orgId,
      space_id: spaceId,
      last_receipt_number: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: spaceId ? 'organization_id,space_id' : 'organization_id' },
  )
  if (error) throw error
  return `R-${String(next).padStart(6, '0')}`
}

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}
function dayKey(d: Date): string {
  return startOfDayUTC(d).toISOString().slice(0, 10)
}

/** Latest ledger on-hand for an item, else its cached quantity_on_hand. */
async function currentQty(itemId: string): Promise<number> {
  const { data: lastTx } = await supabaseAdmin
    .from('inventory_transactions')
    .select('quantity_after')
    .eq('item_id', itemId)
    .order('performed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (lastTx) return Number(lastTx.quantity_after ?? 0)
  const { data: item } = await supabaseAdmin
    .from('inventory_items')
    .select('quantity_on_hand')
    .eq('id', itemId)
    .maybeSingle()
  return Number(item?.quantity_on_hand ?? 0)
}


export class TransactionsRepository {
  async aggregate(tenant: TenantContext, opts: AggregateOpts): Promise<AggregateResult> {
    const to = opts.to ?? new Date()
    const from = opts.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)

    const { data, error } = await supabaseAdmin
      .from('pos_transactions')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
    if (error) throw error

    const txs = (data ?? [])
      .map(toTransaction)
      .filter((t) => t.status === 'completed' && !t.parentTransactionId)

    const totals = txs.reduce(
      (acc, t) => {
        acc.transactions += 1
        acc.subtotal += t.subtotal
        acc.taxAmount += t.taxAmount
        acc.discountAmount += t.discountAmount
        acc.total += t.total
        return acc
      },
      { transactions: 0, subtotal: 0, taxAmount: 0, discountAmount: 0, total: 0 },
    )

    const map = new Map<string, AggregateBucket>()
    const upsert = (key: string, label: string, mut: (b: AggregateBucket) => void) => {
      let b = map.get(key)
      if (!b) {
        b = { key, label, count: 0, subtotal: 0, taxAmount: 0, discountAmount: 0, total: 0 }
        map.set(key, b)
      }
      mut(b)
    }

    const { groupBy } = opts
    if (groupBy === 'day') {
      for (const t of txs) {
        const k = dayKey(t.createdAt)
        upsert(k, k, (b) => { b.count++; b.subtotal += t.subtotal; b.taxAmount += t.taxAmount; b.discountAmount += t.discountAmount; b.total += t.total })
      }
    } else if (groupBy === 'cashier') {
      for (const t of txs) {
        upsert(t.cashierId, t.cashierName || t.cashierId, (b) => { b.count++; b.subtotal += t.subtotal; b.taxAmount += t.taxAmount; b.discountAmount += t.discountAmount; b.total += t.total })
      }
    } else if (groupBy === 'paymentMethod') {
      for (const t of txs) {
        for (const p of t.payments) {
          if (p.amount <= 0) continue
          upsert(p.method, p.method, (b) => { b.count++; b.total += p.amount })
        }
      }
    } else if (groupBy === 'session') {
      for (const t of txs) {
        upsert(t.sessionId, t.sessionId, (b) => { b.count++; b.subtotal += t.subtotal; b.taxAmount += t.taxAmount; b.discountAmount += t.discountAmount; b.total += t.total })
      }
    } else if (groupBy === 'item') {
      for (const t of txs) {
        for (const line of t.items) {
          upsert(line.inventoryItemId, line.inventoryItemName, (b) => {
            b.count++
            b.quantity = (b.quantity ?? 0) + line.quantity
            b.subtotal += line.lineTotal - line.taxAmount
            b.taxAmount += line.taxAmount
            b.discountAmount += line.discountAmount
            b.total += line.lineTotal
          })
        }
      }
    }

    let buckets = Array.from(map.values())
    if (groupBy === 'day') buckets.sort((a, b) => a.key.localeCompare(b.key))
    else buckets.sort((a, b) => b.total - a.total)
    if (groupBy === 'item' && opts.topN && opts.topN > 0) buckets = buckets.slice(0, opts.topN)

    return { groupBy, from, to, buckets, totals }
  }

  async list(tenant: TenantContext, opts?: ListOpts) {
    let q = supabaseAdmin
      .from('pos_transactions')
      .select('*')
      .eq('organization_id', tenant.organizationId)
    if (opts?.sessionId) q = q.eq('session_id', opts.sessionId)
    if (opts?.status) q = q.eq('status', opts.status)
    const { data, error } = await q
    if (error) throw error
    const items = (data ?? [])
      .map(toTransaction)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const page = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 20
    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    return { items: items.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages }
  }

  async getById(tenant: TenantContext, id: string): Promise<PosTransaction | null> {
    const { data } = await supabaseAdmin
      .from('pos_transactions')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || data.organization_id !== tenant.organizationId) return null
    return toTransaction(data)
  }

  async findByOfflineId(tenant: TenantContext, offlineId: string): Promise<PosTransaction | null> {
    const { data } = await supabaseAdmin
      .from('pos_transactions')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .eq('offline_id', offlineId)
      .limit(1)
      .maybeSingle()
    return data ? toTransaction(data) : null
  }

  /**
   * Complete a sale. Idempotent on offlineId. Was one Firestore transaction;
   * here: validate → write the pos_transactions row → per-line stock-OUT
   * ledger rows → refresh item stock_status. Read-modify-write (race caveat
   * the original flagged as acceptable for v1).
   */
  async completeSale(tenant: TenantContext, input: CompleteSaleInput): Promise<PosTransaction> {
    const existing = await this.findByOfflineId(tenant, input.offlineId)
    if (existing) return existing

    const priced = priceCart(input.lines)
    const totalsPaid = input.payments.reduce((acc, p) => acc + p.amount, 0)
    if (totalsPaid + 0.0001 < priced.totals.total) {
      throw new Error('Payments do not cover the total')
    }
    const change = computeChange(priced.totals.total, input.payments)

    // Validate session is open.
    const { data: session } = await supabaseAdmin
      .from('pos_sessions')
      .select('id, organization_id, status, location_id')
      .eq('id', input.sessionId)
      .maybeSingle()
    if (!session || session.organization_id !== tenant.organizationId) {
      throw new Error('Session not found')
    }
    if (session.status !== 'open') {
      throw new Error('Session is closed — open a new session before selling')
    }

    // Verify every item belongs to this org before writing anything. The RPC
    // will also catch this, but an early read-only check surfaces a clear 400
    // rather than a Postgres exception.
    const uniqueItemIds = Array.from(new Set(input.lines.map((l) => l.itemId)))
    const { data: itemRows, error: itemErr } = await supabaseAdmin
      .from('inventory_items')
      .select('id, organization_id, item_type')
      .in('id', uniqueItemIds)
    if (itemErr) throw itemErr
    const serviceItemIds = new Set<string>()
    for (const iid of uniqueItemIds) {
      const r = (itemRows ?? []).find((row) => (row as Row).id === iid) as Row | undefined
      if (!r || r.organization_id !== tenant.organizationId) {
        throw new Error(`Inventory item not found: ${iid}`)
      }
      if (r.item_type === 'service') serviceItemIds.add(iid)
    }

    const receiptNumber = await allocateReceiptNumber(tenant.organizationId, tenant.spaceId)
    const now = new Date().toISOString()
    const items = priced.lines.map((l) => ({
      inventoryItemId: l.itemId,
      inventoryItemName: l.itemName,
      sku: l.sku,
      barcode: l.barcode,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRateId: l.taxRateId,
      taxRate: l.taxRate,
      taxAmount: l.taxAmount,
      discountAmount: l.discount,
      lineTotal: l.lineTotal,
    }))

    const { data: tx, error: txErr } = await supabaseAdmin
      .from('pos_transactions')
      .insert({
        organization_id: tenant.organizationId,
        space_id: tenant.spaceId,
        session_id: input.sessionId,
        location_id: session.location_id ?? 'default',
        cashier_id: tenant.userId,
        cashier_name: tenant.user.displayName ?? tenant.user.email ?? '',
        customer_id: input.customerId ?? null,
        customer_name: input.customerName ?? null,
        items,
        subtotal: priced.totals.subtotal,
        tax_amount: priced.totals.taxTotal,
        discount_amount: priced.totals.discountTotal,
        total: priced.totals.total,
        payments: input.payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          reference: p.reference ?? null,
          cardLast4: p.cardLast4 || null,
        })),
        change,
        status: 'completed',
        receipt_number: receiptNumber,
        offline_id: input.offlineId,
        synced_at: now,
        parent_transaction_id: null,
        fawtara: null,
      })
      .select('*')
      .single()
    if (txErr) throw txErr
    const posTxId = tx.id as string

    // Each line decrements stock atomically via the `inventory_apply_stock_out`
    // RPC (migration 0016). The function row-locks the item before reading the
    // current quantity, then inserts the ledger row and updates stock_status in
    // one transaction — preventing oversell from concurrent sales of the same
    // item. Lines for different items run in parallel; lines sharing an item
    // are serialised by Postgres's row lock (the second caller waits for the
    // first to commit, then reads the already-updated quantity_after).
    const stockResults = await Promise.allSettled(
      priced.lines
        .filter((line) => !serviceItemIds.has(line.itemId))
        .map((line) =>
          supabaseAdmin.rpc('inventory_apply_stock_out', {
            p_org:      tenant.organizationId,
            p_space:    tenant.spaceId ?? null,
            p_item:     line.itemId,
            p_qty:      line.quantity,
            p_item_name: line.itemName,
            p_reason:   'POS sale',
            p_note:     `Receipt ${receiptNumber}`,
            p_source:   'pos',
            p_pos_tx:   posTxId,
            p_by:       tenant.userId,
            p_by_email: tenant.user.email ?? null,
            p_by_name:  tenant.user.displayName ?? null,
            p_by_role:  tenant.role ?? null,
          }),
        ),
    )
    for (const result of stockResults) {
      if (result.status === 'rejected') throw result.reason
      if (result.value.error) {
        const msg = result.value.error.message ?? ''
        if (msg.includes('INSUFFICIENT_STOCK')) {
          const itemId = msg.split(':')[1]?.trim() ?? ''
          const name = priced.lines.find((l) => l.itemId === itemId)?.itemName ?? itemId
          throw new Error(`Insufficient stock for ${name}`)
        }
        throw result.value.error
      }
    }

    return toTransaction(tx)
  }

  /**
   * Void a completed sale (same open session). Restores stock per line.
   */
  async voidTransaction(tenant: TenantContext, id: string): Promise<void> {
    const tx = await this.getById(tenant, id)
    if (!tx) throw new Error('Transaction not found')
    if (tx.status !== 'completed') throw new Error('Only completed transactions can be voided')

    const { data: session } = await supabaseAdmin
      .from('pos_sessions')
      .select('status')
      .eq('id', tx.sessionId)
      .maybeSingle()
    if (!session || session.status !== 'open') {
      throw new Error('Cannot void after the session has closed — issue a refund instead')
    }

    for (const line of tx.items) {
      const { data: item } = await supabaseAdmin
        .from('inventory_items')
        .select('id, minimum_threshold, item_type')
        .eq('id', line.inventoryItemId)
        .maybeSingle()
      if (!item) continue
      if (item.item_type === 'service') continue // never stock-decremented — nothing to restock
      const before = await currentQty(line.inventoryItemId)
      const after = before + line.quantity
      const threshold = Number(item.minimum_threshold ?? 0)
      const { error: invErr } = await supabaseAdmin.from('inventory_transactions').insert({
        organization_id: tenant.organizationId,
        space_id: tenant.spaceId,
        item_id: line.inventoryItemId,
        item_name: line.inventoryItemName,
        type: 'in',
        quantity: line.quantity,
        quantity_before: before,
        quantity_after: after,
        reason: 'POS void',
        note: `Voided ${tx.receiptNumber}`,
        source: 'pos-void',
        pos_transaction_id: id,
        performed_by: tenant.userId,
      })
      if (invErr) throw invErr
      await supabaseAdmin
        .from('inventory_items')
        .update({ stock_status: after === 0 ? 'out' : after < threshold ? 'low' : 'ok' })
        .eq('id', line.inventoryItemId)
    }

    const { error } = await supabaseAdmin
      .from('pos_transactions')
      .update({
        status: 'voided',
        voided_by: tenant.userId,
        voided_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
  }

  /**
   * Refund as an inverse transaction (new row with parent_transaction_id,
   * negative-amount payments, stock-IN per refunded line).
   */
  async refundTransaction(
    tenant: TenantContext,
    id: string,
    opts: { lineIndexes?: number[]; reason?: string },
  ): Promise<{ refundTransactionId: string }> {
    const orig = await this.getById(tenant, id)
    if (!orig) throw new Error('Transaction not found')
    if (orig.status !== 'completed') throw new Error('Only completed transactions can be refunded')

    const indexes = opts.lineIndexes ?? orig.items.map((_, i) => i)
    const refundedLines = indexes.map((i) => orig.items[i]).filter(Boolean)
    if (refundedLines.length === 0) throw new Error('Nothing to refund')

    const refundSubtotal = refundedLines.reduce((acc, l) => acc + (l.lineTotal - l.taxAmount), 0)
    const refundTaxTotal = refundedLines.reduce((acc, l) => acc + l.taxAmount, 0)
    const refundDiscountTotal = refundedLines.reduce((acc, l) => acc + l.discountAmount, 0)
    const refundTotal = refundedLines.reduce((acc, l) => acc + l.lineTotal, 0)
    const receiptNumber = await allocateReceiptNumber(tenant.organizationId, tenant.spaceId)
    const fullyRefunded = refundedLines.length === orig.items.length

    // Cash-first split mirroring the original payment mix.
    const cashShare = orig.payments.find((p) => p.method === 'cash')?.amount ?? 0
    const cardShare = orig.payments
      .filter((p) => p.method !== 'cash')
      .reduce((acc, p) => acc + p.amount, 0)
    const totalPaid = cashShare + cardShare
    const cashRatio = totalPaid > 0 ? cashShare / totalPaid : 1
    const refundCash = +(refundTotal * cashRatio).toFixed(4)
    const refundCard = +(refundTotal - refundCash).toFixed(4)
    const payments = [
      refundCash > 0 ? { method: 'cash', amount: -refundCash, reference: null, cardLast4: null } : null,
      refundCard > 0 ? { method: 'card', amount: -refundCard, reference: null, cardLast4: null } : null,
    ].filter(Boolean)

    const { data: refund, error: rErr } = await supabaseAdmin
      .from('pos_transactions')
      .insert({
        organization_id: tenant.organizationId,
        space_id: tenant.spaceId,
        session_id: orig.sessionId,
        location_id: orig.locationId ?? 'default',
        cashier_id: tenant.userId,
        cashier_name: tenant.user.displayName ?? tenant.user.email ?? '',
        customer_id: orig.customerId ?? null,
        customer_name: orig.customerName ?? null,
        items: refundedLines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          inventoryItemName: l.inventoryItemName,
          sku: l.sku,
          barcode: l.barcode,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRateId: l.taxRateId,
          taxRate: l.taxRate,
          taxAmount: l.taxAmount,
          discountAmount: l.discountAmount,
          lineTotal: l.lineTotal,
        })),
        subtotal: refundSubtotal,
        tax_amount: refundTaxTotal,
        discount_amount: refundDiscountTotal,
        total: refundTotal,
        payments,
        change: 0,
        status: 'refunded',
        receipt_number: receiptNumber,
        offline_id: `refund-${id}-${Date.now()}`,
        synced_at: new Date().toISOString(),
        parent_transaction_id: id,
        fawtara: null,
        refund_reason: opts.reason ?? null,
      })
      .select('id')
      .single()
    if (rErr) throw rErr
    const refundId = refund.id as string

    for (const line of refundedLines) {
      const { data: item } = await supabaseAdmin
        .from('inventory_items')
        .select('id, minimum_threshold, item_type')
        .eq('id', line.inventoryItemId)
        .maybeSingle()
      if (!item) continue
      if (item.item_type === 'service') continue // never stock-decremented — nothing to restock
      const before = await currentQty(line.inventoryItemId)
      const after = before + line.quantity
      const threshold = Number(item.minimum_threshold ?? 0)
      const { error: invErr } = await supabaseAdmin.from('inventory_transactions').insert({
        organization_id: tenant.organizationId,
        space_id: tenant.spaceId,
        item_id: line.inventoryItemId,
        item_name: line.inventoryItemName,
        type: 'in',
        quantity: line.quantity,
        quantity_before: before,
        quantity_after: after,
        reason: 'POS refund',
        note: `Refund of ${orig.receiptNumber}${opts.reason ? ` — ${opts.reason}` : ''}`,
        source: 'pos-refund',
        pos_transaction_id: refundId,
        performed_by: tenant.userId,
      })
      if (invErr) throw invErr
      await supabaseAdmin
        .from('inventory_items')
        .update({ stock_status: after === 0 ? 'out' : after < threshold ? 'low' : 'ok' })
        .eq('id', line.inventoryItemId)
    }

    const { error: upErr } = await supabaseAdmin
      .from('pos_transactions')
      .update({ status: fullyRefunded ? 'refunded' : 'completed' })
      .eq('id', id)
    if (upErr) throw upErr

    return { refundTransactionId: refundId }
  }
}
