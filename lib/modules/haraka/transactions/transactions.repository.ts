import { adminDb } from '@/lib/firebase/admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { PosLineItem, PosPayment, PosTransaction } from '@/types'
import { priceCart, computeChange, type CartLineInput } from '@/lib/modules/haraka/pricing/calc'

function tsToDate(v: unknown): Date {
  return v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date()
}

function toLine(d: FirebaseFirestore.DocumentData): PosLineItem {
  return {
    inventoryItemId: d.inventoryItemId,
    inventoryItemName: d.inventoryItemName,
    sku: d.sku ?? null,
    barcode: d.barcode ?? null,
    quantity: Number(d.quantity ?? 0),
    unitPrice: Number(d.unitPrice ?? 0),
    taxRateId: d.taxRateId ?? null,
    taxRate: Number(d.taxRate ?? 0),
    taxAmount: Number(d.taxAmount ?? 0),
    discountAmount: Number(d.discountAmount ?? 0),
    lineTotal: Number(d.lineTotal ?? 0),
  }
}

function toPayment(d: FirebaseFirestore.DocumentData): PosPayment {
  return {
    method: d.method,
    amount: Number(d.amount ?? 0),
    reference: d.reference ?? null,
    cardLast4: d.cardLast4 ?? null,
  }
}

function toTransaction(id: string, d: FirebaseFirestore.DocumentData): PosTransaction {
  return {
    id,
    organizationId: d.organizationId,
    sessionId: d.sessionId,
    locationId: d.locationId ?? 'default',
    cashierId: d.cashierId,
    cashierName: d.cashierName ?? '',
    customerId: d.customerId ?? null,
    customerName: d.customerName ?? null,
    items: Array.isArray(d.items) ? d.items.map(toLine) : [],
    subtotal: Number(d.subtotal ?? 0),
    taxAmount: Number(d.taxAmount ?? 0),
    discountAmount: Number(d.discountAmount ?? 0),
    total: Number(d.total ?? 0),
    payments: Array.isArray(d.payments) ? d.payments.map(toPayment) : [],
    change: Number(d.change ?? 0),
    status: d.status ?? 'completed',
    receiptNumber: d.receiptNumber ?? '',
    offlineId: d.offlineId ?? '',
    syncedAt: d.syncedAt ? tsToDate(d.syncedAt) : null,
    parentTransactionId: d.parentTransactionId ?? null,
    fawtara: d.fawtara ?? null,
    createdAt: tsToDate(d.createdAt),
    updatedAt: tsToDate(d.updatedAt),
  }
}

export interface CompleteSaleInput {
  sessionId: string
  customerId?: string | null
  customerName?: string | null
  lines: CartLineInput[]
  payments: Array<{ method: 'cash' | 'card' | 'other'; amount: number; reference?: string | null; cardLast4?: string | null }>
  offlineId: string
}

interface ListOpts {
  sessionId?: string
  status?: 'completed' | 'refunded' | 'voided'
  page?: number
  pageSize?: number
}

export type AggregateGroupBy = 'day' | 'item' | 'cashier' | 'paymentMethod' | 'session'

export interface AggregateOpts {
  /** Inclusive date range; defaults to last 30 days when omitted. */
  from?: Date
  to?: Date
  groupBy: AggregateGroupBy
  /** How many top buckets to return when groupBy='item'. Other groupings return all. */
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
  /** Item-only: quantity sold across all sales of the item in the range. */
  quantity?: number
}

export interface AggregateResult {
  groupBy: AggregateGroupBy
  from: Date
  to: Date
  buckets: AggregateBucket[]
  totals: {
    transactions: number
    subtotal: number
    taxAmount: number
    discountAmount: number
    total: number
  }
}

/**
 * Allocate the next per-org receipt number atomically. Stored on a single
 * counter doc (`posReceiptCounters/{orgId}`) — Firestore transaction ensures
 * monotonic sequence even under concurrent sales.
 */
async function allocateReceiptNumber(orgId: string): Promise<string> {
  const ref = adminDb.collection('posReceiptCounters').doc(orgId)
  const next = await adminDb.runTransaction(async (t) => {
    const doc = await t.get(ref)
    const current = doc.exists ? Number(doc.data()!.lastReceiptNumber ?? 0) : 0
    const next = current + 1
    t.set(ref, { organizationId: orgId, lastReceiptNumber: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    return next
  })
  // Format: zero-padded 6 digits. Org-scoped, not globally unique by design.
  return `R-${String(next).padStart(6, '0')}`
}

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function dayKey(d: Date): string {
  return startOfDayUTC(d).toISOString().slice(0, 10)
}

export class TransactionsRepository {
  /**
   * Group `completed` transactions in the given date range and roll up totals.
   * Voids/refunds are excluded from sales bucket math (refunds appear separately
   * elsewhere). Performed in-memory after a single bounded query — fine for
   * org-scoped report windows (≤ a few thousand docs).
   */
  async aggregate(tenant: TenantContext, opts: AggregateOpts): Promise<AggregateResult> {
    const to = opts.to ?? new Date()
    const from = opts.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)

    const snap = await adminDb
      .collection('posTransactions')
      .where('organizationId', '==', tenant.organizationId)
      .where('createdAt', '>=', Timestamp.fromDate(from))
      .where('createdAt', '<=', Timestamp.fromDate(to))
      .get()

    const txs: PosTransaction[] = snap.docs
      .map((d) => toTransaction(d.id, d.data()))
      // Only count completed sales for sales aggregations. Refunds (parented)
      // and voids are excluded — they're net-negative entries the manager
      // already saw on the transaction list.
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

    const groupBy = opts.groupBy
    const map = new Map<string, AggregateBucket>()

    const upsert = (key: string, label: string, mut: (b: AggregateBucket) => void) => {
      let b = map.get(key)
      if (!b) {
        b = { key, label, count: 0, subtotal: 0, taxAmount: 0, discountAmount: 0, total: 0 }
        map.set(key, b)
      }
      mut(b)
    }

    if (groupBy === 'day') {
      for (const t of txs) {
        const k = dayKey(t.createdAt)
        upsert(k, k, (b) => {
          b.count += 1
          b.subtotal += t.subtotal
          b.taxAmount += t.taxAmount
          b.discountAmount += t.discountAmount
          b.total += t.total
        })
      }
    } else if (groupBy === 'cashier') {
      for (const t of txs) {
        upsert(t.cashierId, t.cashierName || t.cashierId, (b) => {
          b.count += 1
          b.subtotal += t.subtotal
          b.taxAmount += t.taxAmount
          b.discountAmount += t.discountAmount
          b.total += t.total
        })
      }
    } else if (groupBy === 'paymentMethod') {
      for (const t of txs) {
        // A sale can split across methods. Attribute each payment's amount
        // to its method; line subtotals/tax stay on the transaction count.
        for (const p of t.payments) {
          if (p.amount <= 0) continue
          upsert(p.method, p.method, (b) => {
            b.count += 1
            b.total += p.amount
          })
        }
      }
    } else if (groupBy === 'session') {
      for (const t of txs) {
        upsert(t.sessionId, t.sessionId, (b) => {
          b.count += 1
          b.subtotal += t.subtotal
          b.taxAmount += t.taxAmount
          b.discountAmount += t.discountAmount
          b.total += t.total
        })
      }
    } else if (groupBy === 'item') {
      for (const t of txs) {
        for (const line of t.items) {
          upsert(line.inventoryItemId, line.inventoryItemName, (b) => {
            b.count += 1
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
    if (groupBy === 'day') {
      buckets.sort((a, b) => a.key.localeCompare(b.key))
    } else {
      buckets.sort((a, b) => b.total - a.total)
    }
    if (groupBy === 'item' && opts.topN && opts.topN > 0) {
      buckets = buckets.slice(0, opts.topN)
    }

    return { groupBy, from, to, buckets, totals }
  }

  async list(tenant: TenantContext, opts?: ListOpts) {
    let q: FirebaseFirestore.Query = adminDb
      .collection('posTransactions')
      .where('organizationId', '==', tenant.organizationId)
    if (opts?.sessionId) q = q.where('sessionId', '==', opts.sessionId)
    if (opts?.status) q = q.where('status', '==', opts.status)
    const snap = await q.get()
    let items = snap.docs.map((d) => toTransaction(d.id, d.data()))
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const page = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 20
    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    return { items: items.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages }
  }

  async getById(tenant: TenantContext, id: string): Promise<PosTransaction | null> {
    const doc = await adminDb.collection('posTransactions').doc(id).get()
    if (!doc.exists) return null
    const d = doc.data()!
    if (d.organizationId !== tenant.organizationId) return null
    return toTransaction(id, d)
  }

  async findByOfflineId(tenant: TenantContext, offlineId: string): Promise<PosTransaction | null> {
    const snap = await adminDb
      .collection('posTransactions')
      .where('organizationId', '==', tenant.organizationId)
      .where('offlineId', '==', offlineId)
      .limit(1)
      .get()
    if (snap.empty) return null
    return toTransaction(snap.docs[0].id, snap.docs[0].data())
  }

  /**
   * Atomic complete-sale: validates session is open + verifies stock for every
   * line + writes the transaction doc + writes per-line stock-OUT transactions
   * + updates each item's stockStatus, all in one Firestore transaction. If
   * anything fails, no writes land.
   *
   * Idempotency: callers send a stable `offlineId`. We check for a prior
   * transaction with the same offlineId before doing any work and return it
   * unchanged on a duplicate Submit (protects against double-clicks).
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
    const receiptNumber = await allocateReceiptNumber(tenant.organizationId)

    // Pre-read each item's current quantity outside the transaction. Inside
    // the transaction we re-read to validate (Firestore allows reads-before-
    // writes; the per-line tx writes the snapshot quantityAfter).
    const uniqueItemIds = Array.from(new Set(input.lines.map((l) => l.itemId)))
    const qtyBefore = new Map<string, number>()
    for (const iid of uniqueItemIds) {
      const lastTxSnap = await adminDb
        .collection('inventoryTransactions')
        .where('itemId', '==', iid)
        .orderBy('performedAt', 'desc')
        .limit(1)
        .get()
      if (!lastTxSnap.empty) {
        qtyBefore.set(iid, Number(lastTxSnap.docs[0].data().quantityAfter ?? 0))
      } else {
        const itemDoc = await adminDb.collection('inventoryItems').doc(iid).get()
        qtyBefore.set(iid, Number(itemDoc.data()?.quantityOnHand ?? 0))
      }
    }

    return adminDb.runTransaction(async (t) => {
      // Re-validate session is open.
      const sessionRef = adminDb.collection('posSessions').doc(input.sessionId)
      const sessionDoc = await t.get(sessionRef)
      if (!sessionDoc.exists || sessionDoc.data()!.organizationId !== tenant.organizationId) {
        throw new Error('Session not found')
      }
      if (sessionDoc.data()!.status !== 'open') {
        throw new Error('Session is closed — open a new session before selling')
      }

      // Reads first: re-fetch each item to confirm ownership + stock sufficiency.
      const itemRefs = uniqueItemIds.map((iid) => adminDb.collection('inventoryItems').doc(iid))
      const itemDocs = await Promise.all(itemRefs.map((r) => t.get(r)))
      const itemDataById = new Map<string, FirebaseFirestore.DocumentData>()
      itemDocs.forEach((doc, idx) => {
        const iid = uniqueItemIds[idx]
        if (!doc.exists || doc.data()!.organizationId !== tenant.organizationId) {
          throw new Error(`Inventory item not found: ${iid}`)
        }
        itemDataById.set(iid, doc.data()!)
      })

      // Compute final qty per item, validating stock.
      const finalQty = new Map<string, number>()
      for (const iid of uniqueItemIds) finalQty.set(iid, qtyBefore.get(iid) ?? 0)
      for (const line of priced.lines) {
        const before = finalQty.get(line.itemId) ?? 0
        const after = before - line.quantity
        if (after < 0) {
          throw new Error(`Insufficient stock for ${line.itemName}`)
        }
        finalQty.set(line.itemId, after)
      }

      // Writes: per-line stock-OUT, items' stockStatus, the transaction doc.
      const txRef = adminDb.collection('posTransactions').doc()
      const now = new Date()

      for (const line of priced.lines) {
        const before = qtyBefore.get(line.itemId) ?? 0
        const finalAfter = finalQty.get(line.itemId) ?? 0
        const invTxRef = adminDb.collection('inventoryTransactions').doc()
        t.set(invTxRef, {
          organizationId: tenant.organizationId,
          itemId: line.itemId,
          itemName: line.itemName,
          type: 'out',
          quantity: line.quantity,
          quantityBefore: before,
          quantityAfter: finalAfter,
          reason: 'POS sale',
          note: `Receipt ${receiptNumber}`,
          source: 'pos',
          posTransactionId: txRef.id,
          performedBy: tenant.userId,
          performedByEmail: tenant.user.email ?? null,
          performedByName: tenant.user.displayName ?? null,
          performedByRole: tenant.role ?? null,
          performedAt: FieldValue.serverTimestamp(),
        })
        // Note: qtyBefore for the NEXT line of the same item should be the new running total, but
        // inventoryTransactions are append-only and `quantityBefore` on each row represents the
        // state immediately before that row. Updating qtyBefore as we go.
        qtyBefore.set(line.itemId, finalAfter)
      }

      for (const iid of uniqueItemIds) {
        const data = itemDataById.get(iid)!
        const threshold = Number(data.minimumThreshold ?? 0)
        const q = finalQty.get(iid) ?? 0
        t.update(adminDb.collection('inventoryItems').doc(iid), {
          stockStatus: q === 0 ? 'out' : q < threshold ? 'low' : 'ok',
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: tenant.userId,
        })
      }

      t.set(txRef, {
        organizationId: tenant.organizationId,
        sessionId: input.sessionId,
        locationId: sessionDoc.data()!.locationId ?? 'default',
        cashierId: tenant.userId,
        cashierName: tenant.user.displayName ?? tenant.user.email ?? '',
        customerId: input.customerId ?? null,
        customerName: input.customerName ?? null,
        items: priced.lines.map((l) => ({
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
        })),
        subtotal: priced.totals.subtotal,
        taxAmount: priced.totals.taxTotal,
        discountAmount: priced.totals.discountTotal,
        total: priced.totals.total,
        payments: input.payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          reference: p.reference ?? null,
          cardLast4: p.cardLast4 || null,
        })),
        change,
        status: 'completed',
        receiptNumber,
        offlineId: input.offlineId,
        syncedAt: now,
        parentTransactionId: null,
        fawtara: null,
        createdAt: now,
        updatedAt: now,
      })

      return toTransaction(txRef.id, {
        organizationId: tenant.organizationId,
        sessionId: input.sessionId,
        cashierId: tenant.userId,
        cashierName: tenant.user.displayName ?? tenant.user.email ?? '',
        customerId: input.customerId ?? null,
        customerName: input.customerName ?? null,
        items: priced.lines.map((l) => ({
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
        })),
        subtotal: priced.totals.subtotal,
        taxAmount: priced.totals.taxTotal,
        discountAmount: priced.totals.discountTotal,
        total: priced.totals.total,
        payments: input.payments,
        change,
        status: 'completed',
        receiptNumber,
        offlineId: input.offlineId,
        syncedAt: now,
        parentTransactionId: null,
        fawtara: null,
        createdAt: now,
        updatedAt: now,
      })
    })
  }

  /**
   * Mark transaction as voided (same-session only). Restores stock for all lines.
   * Differs from refund: void = "this sale never happened" (same shift),
   * refund = "we're returning the money on a separate transaction".
   */
  async voidTransaction(tenant: TenantContext, id: string): Promise<void> {
    const ref = adminDb.collection('posTransactions').doc(id)
    const doc = await ref.get()
    if (!doc.exists || doc.data()!.organizationId !== tenant.organizationId) {
      throw new Error('Transaction not found')
    }
    const data = doc.data()!
    if (data.status !== 'completed') {
      throw new Error('Only completed transactions can be voided')
    }

    // Validate same session is still open.
    const sessionDoc = await adminDb.collection('posSessions').doc(data.sessionId).get()
    if (!sessionDoc.exists || sessionDoc.data()!.status !== 'open') {
      throw new Error('Cannot void after the session has closed — issue a refund instead')
    }

    const items = (data.items as PosLineItem[]) ?? []
    await adminDb.runTransaction(async (t) => {
      // Restore stock per line.
      for (const line of items) {
        const itemRef = adminDb.collection('inventoryItems').doc(line.inventoryItemId)
        const itemDoc = await t.get(itemRef)
        if (!itemDoc.exists) continue
        const lastTxSnap = await adminDb
          .collection('inventoryTransactions')
          .where('itemId', '==', line.inventoryItemId)
          .orderBy('performedAt', 'desc')
          .limit(1)
          .get()
        const before = lastTxSnap.empty
          ? Number(itemDoc.data()!.quantityOnHand ?? 0)
          : Number(lastTxSnap.docs[0].data().quantityAfter ?? 0)
        const after = before + line.quantity
        const threshold = Number(itemDoc.data()!.minimumThreshold ?? 0)
        const invTxRef = adminDb.collection('inventoryTransactions').doc()
        t.set(invTxRef, {
          organizationId: tenant.organizationId,
          itemId: line.inventoryItemId,
          itemName: line.inventoryItemName,
          type: 'in',
          quantity: line.quantity,
          quantityBefore: before,
          quantityAfter: after,
          reason: 'POS void',
          note: `Voided ${data.receiptNumber}`,
          source: 'pos-void',
          posTransactionId: id,
          performedBy: tenant.userId,
          performedAt: FieldValue.serverTimestamp(),
        })
        t.update(itemRef, {
          stockStatus: after === 0 ? 'out' : after < threshold ? 'low' : 'ok',
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
      t.update(ref, {
        status: 'voided',
        updatedAt: FieldValue.serverTimestamp(),
        voidedBy: tenant.userId,
        voidedAt: FieldValue.serverTimestamp(),
      })
    })
  }

  /**
   * Issue a refund as an inverse transaction. Creates a NEW posTransactions
   * doc with `parentTransactionId` set, negative-amount payments, and an
   * `'in'` inventory transaction per refunded line. Original stays as
   * 'completed' but flips to 'refunded' if fully reversed.
   */
  async refundTransaction(
    tenant: TenantContext,
    id: string,
    opts: { lineIndexes?: number[]; reason?: string },
  ): Promise<{ refundTransactionId: string }> {
    const origRef = adminDb.collection('posTransactions').doc(id)
    const origDoc = await origRef.get()
    if (!origDoc.exists || origDoc.data()!.organizationId !== tenant.organizationId) {
      throw new Error('Transaction not found')
    }
    const orig = origDoc.data()!
    if (orig.status !== 'completed') {
      throw new Error('Only completed transactions can be refunded')
    }
    const origItems = (orig.items as PosLineItem[]) ?? []
    const indexes = opts.lineIndexes ?? origItems.map((_, i) => i)
    const refundedLines = indexes.map((i) => origItems[i]).filter(Boolean)
    if (refundedLines.length === 0) {
      throw new Error('Nothing to refund')
    }

    const refundSubtotal = refundedLines.reduce((acc, l) => acc + (l.lineTotal - l.taxAmount), 0)
    const refundTaxTotal = refundedLines.reduce((acc, l) => acc + l.taxAmount, 0)
    const refundDiscountTotal = refundedLines.reduce((acc, l) => acc + l.discountAmount, 0)
    const refundTotal = refundedLines.reduce((acc, l) => acc + l.lineTotal, 0)

    const receiptNumber = await allocateReceiptNumber(tenant.organizationId)
    const fullyRefunded = refundedLines.length === origItems.length

    await adminDb.runTransaction(async (t) => {
      const refundRef = adminDb.collection('posTransactions').doc()

      for (const line of refundedLines) {
        const itemRef = adminDb.collection('inventoryItems').doc(line.inventoryItemId)
        const itemDoc = await t.get(itemRef)
        if (!itemDoc.exists) continue
        const lastTxSnap = await adminDb
          .collection('inventoryTransactions')
          .where('itemId', '==', line.inventoryItemId)
          .orderBy('performedAt', 'desc')
          .limit(1)
          .get()
        const before = lastTxSnap.empty
          ? Number(itemDoc.data()!.quantityOnHand ?? 0)
          : Number(lastTxSnap.docs[0].data().quantityAfter ?? 0)
        const after = before + line.quantity
        const threshold = Number(itemDoc.data()!.minimumThreshold ?? 0)
        const invTxRef = adminDb.collection('inventoryTransactions').doc()
        t.set(invTxRef, {
          organizationId: tenant.organizationId,
          itemId: line.inventoryItemId,
          itemName: line.inventoryItemName,
          type: 'in',
          quantity: line.quantity,
          quantityBefore: before,
          quantityAfter: after,
          reason: 'POS refund',
          note: `Refund of ${orig.receiptNumber}${opts.reason ? ` — ${opts.reason}` : ''}`,
          source: 'pos-refund',
          posTransactionId: refundRef.id,
          performedBy: tenant.userId,
          performedAt: FieldValue.serverTimestamp(),
        })
        t.update(itemRef, {
          stockStatus: after === 0 ? 'out' : after < threshold ? 'low' : 'ok',
          updatedAt: FieldValue.serverTimestamp(),
        })
      }

      // Negative-amount payments mirror the original mix (cash-first refund).
      const origPayments = (orig.payments as PosPayment[]) ?? []
      const cashShare = origPayments.find((p) => p.method === 'cash')?.amount ?? 0
      const cardShare = origPayments
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

      t.set(refundRef, {
        organizationId: tenant.organizationId,
        sessionId: orig.sessionId,
        locationId: orig.locationId ?? 'default',
        cashierId: tenant.userId,
        cashierName: tenant.user.displayName ?? tenant.user.email ?? '',
        customerId: orig.customerId ?? null,
        customerName: orig.customerName ?? null,
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
        taxAmount: refundTaxTotal,
        discountAmount: refundDiscountTotal,
        total: refundTotal,
        payments,
        change: 0,
        status: 'refunded',
        receiptNumber,
        offlineId: `refund-${id}-${Date.now()}`,
        syncedAt: new Date(),
        parentTransactionId: id,
        fawtara: null,
        refundReason: opts.reason ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      t.update(origRef, {
        status: fullyRefunded ? 'refunded' : 'completed',
        updatedAt: FieldValue.serverTimestamp(),
      })
    })

    const newId = (await adminDb
      .collection('posTransactions')
      .where('parentTransactionId', '==', id)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()).docs[0]?.id

    return { refundTransactionId: newId ?? '' }
  }
}
