import { adminDb } from '@/lib/firebase/admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { Purchase, PurchaseLine, PurchaseStatus } from '@/types'

function tsToDate(v: unknown): Date {
  return v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date()
}

function toLine(d: FirebaseFirestore.DocumentData): PurchaseLine {
  return {
    itemId: d.itemId ?? null,
    itemName: d.itemName,
    sku: d.sku ?? null,
    barcode: d.barcode ?? null,
    quantity: Number(d.quantity ?? 0),
    unitCost: Number(d.unitCost ?? 0),
    taxRateId: d.taxRateId ?? null,
    taxAmount: Number(d.taxAmount ?? 0),
    lineTotal: Number(d.lineTotal ?? 0),
    notes: d.notes ?? null,
  }
}

function toPurchase(id: string, d: FirebaseFirestore.DocumentData): Purchase {
  return {
    id,
    organizationId: d.organizationId,
    supplierName: d.supplierName,
    supplierContact: d.supplierContact ?? null,
    invoiceNumber: d.invoiceNumber ?? null,
    invoiceDate: tsToDate(d.invoiceDate),
    receivedDate: d.receivedDate ? tsToDate(d.receivedDate) : null,
    status: (d.status as PurchaseStatus) ?? 'draft',
    lines: Array.isArray(d.lines) ? d.lines.map(toLine) : [],
    subtotal: Number(d.subtotal ?? 0),
    taxTotal: Number(d.taxTotal ?? 0),
    total: Number(d.total ?? 0),
    notes: d.notes ?? null,
    updateItemUnitCost: d.updateItemUnitCost === true,
    createdAt: tsToDate(d.createdAt),
    createdBy: d.createdBy ?? '',
    createdByEmail: d.createdByEmail ?? null,
    createdByName: d.createdByName ?? null,
    updatedAt: tsToDate(d.updatedAt),
    updatedBy: d.updatedBy ?? '',
    updatedByEmail: d.updatedByEmail ?? null,
    updatedByName: d.updatedByName ?? null,
    receivedBy: d.receivedBy ?? null,
    receivedByName: d.receivedByName ?? null,
  }
}

export interface PurchaseLineInput {
  itemId?: string | null
  itemName: string
  sku?: string | null
  barcode?: string | null
  quantity: number
  unitCost: number
  taxRateId?: string | null
  notes?: string | null
}

export interface PurchaseInput {
  supplierName: string
  supplierContact?: string | null
  invoiceNumber?: string | null
  invoiceDate: Date
  notes?: string | null
  updateItemUnitCost?: boolean
  lines: PurchaseLineInput[]
}

interface TaxRateLookup {
  rates: Map<string, number>
}

async function loadTaxRates(tenant: TenantContext): Promise<TaxRateLookup> {
  const snap = await adminDb
    .collection('taxRates')
    .where('organizationId', '==', tenant.organizationId)
    .get()
  const map = new Map<string, number>()
  snap.docs.forEach((d) => {
    const r = d.data().rate
    if (typeof r === 'number') map.set(d.id, r)
  })
  return { rates: map }
}

function priceLines(
  lines: PurchaseLineInput[],
  taxes: TaxRateLookup,
): { lines: PurchaseLine[]; subtotal: number; taxTotal: number; total: number } {
  let subtotal = 0
  let taxTotal = 0
  const priced: PurchaseLine[] = lines.map((line) => {
    const lineSubtotal = line.quantity * line.unitCost
    const taxRate = line.taxRateId ? taxes.rates.get(line.taxRateId) ?? 0 : 0
    const taxAmount = +(lineSubtotal * taxRate).toFixed(4)
    const lineTotal = +(lineSubtotal + taxAmount).toFixed(4)
    subtotal += lineSubtotal
    taxTotal += taxAmount
    return {
      itemId: line.itemId ?? null,
      itemName: line.itemName,
      sku: line.sku ?? null,
      barcode: line.barcode ?? null,
      quantity: line.quantity,
      unitCost: line.unitCost,
      taxRateId: line.taxRateId ?? null,
      taxAmount,
      lineTotal,
      notes: line.notes ?? null,
    }
  })
  const total = +(subtotal + taxTotal).toFixed(4)
  return { lines: priced, subtotal: +subtotal.toFixed(4), taxTotal: +taxTotal.toFixed(4), total }
}

export interface ListOpts {
  status?: PurchaseStatus
  search?: string
  page?: number
  pageSize?: number
}

export class PurchasesRepository {
  async list(tenant: TenantContext, opts?: ListOpts) {
    const snap = await adminDb
      .collection('purchases')
      .where('organizationId', '==', tenant.organizationId)
      .get()
    let items = snap.docs.map((d) => toPurchase(d.id, d.data()))
    if (opts?.status) items = items.filter((p) => p.status === opts.status)
    if (opts?.search) {
      const term = opts.search.toLowerCase()
      items = items.filter(
        (p) =>
          p.supplierName.toLowerCase().includes(term) ||
          (p.invoiceNumber ?? '').toLowerCase().includes(term),
      )
    }
    items.sort((a, b) => b.invoiceDate.getTime() - a.invoiceDate.getTime())

    const page = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 20
    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    return {
      items: items.slice(start, start + pageSize),
      total,
      page: safePage,
      pageSize,
      totalPages,
    }
  }

  async getById(tenant: TenantContext, id: string): Promise<Purchase | null> {
    const doc = await adminDb.collection('purchases').doc(id).get()
    if (!doc.exists) return null
    const d = doc.data()!
    if (d.organizationId !== tenant.organizationId) return null
    return toPurchase(id, d)
  }

  async create(tenant: TenantContext, input: PurchaseInput): Promise<string> {
    const taxes = await loadTaxRates(tenant)
    const priced = priceLines(input.lines, taxes)
    const now = new Date()

    const ref = await adminDb.collection('purchases').add({
      organizationId: tenant.organizationId,
      supplierName: input.supplierName,
      supplierContact: input.supplierContact ?? null,
      invoiceNumber: input.invoiceNumber ?? null,
      invoiceDate: input.invoiceDate,
      receivedDate: null,
      status: 'draft' as PurchaseStatus,
      lines: priced.lines,
      subtotal: priced.subtotal,
      taxTotal: priced.taxTotal,
      total: priced.total,
      notes: input.notes ?? null,
      updateItemUnitCost: input.updateItemUnitCost === true,
      createdBy: tenant.userId,
      createdByEmail: tenant.user.email ?? null,
      createdByName: tenant.user.displayName ?? null,
      updatedBy: tenant.userId,
      updatedByEmail: tenant.user.email ?? null,
      updatedByName: tenant.user.displayName ?? null,
      receivedBy: null,
      receivedByName: null,
      createdAt: now,
      updatedAt: now,
    })
    return ref.id
  }

  async update(tenant: TenantContext, id: string, input: Partial<PurchaseInput>): Promise<void> {
    const doc = await adminDb.collection('purchases').doc(id).get()
    if (!doc.exists || doc.data()!.organizationId !== tenant.organizationId) {
      throw new Error('Purchase not found')
    }
    if (doc.data()!.status !== 'draft') {
      throw new Error('Only draft purchases can be edited')
    }

    const patch: Record<string, unknown> = {
      updatedBy: tenant.userId,
      updatedByEmail: tenant.user.email ?? null,
      updatedByName: tenant.user.displayName ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    }
    if (input.supplierName !== undefined) patch.supplierName = input.supplierName
    if (input.supplierContact !== undefined) patch.supplierContact = input.supplierContact ?? null
    if (input.invoiceNumber !== undefined) patch.invoiceNumber = input.invoiceNumber ?? null
    if (input.invoiceDate !== undefined) patch.invoiceDate = input.invoiceDate
    if (input.notes !== undefined) patch.notes = input.notes ?? null
    if (input.updateItemUnitCost !== undefined) patch.updateItemUnitCost = input.updateItemUnitCost

    if (input.lines) {
      const taxes = await loadTaxRates(tenant)
      const priced = priceLines(input.lines, taxes)
      patch.lines = priced.lines
      patch.subtotal = priced.subtotal
      patch.taxTotal = priced.taxTotal
      patch.total = priced.total
    }

    await doc.ref.update(patch)
  }

  async delete(tenant: TenantContext, id: string): Promise<void> {
    const doc = await adminDb.collection('purchases').doc(id).get()
    if (!doc.exists || doc.data()!.organizationId !== tenant.organizationId) {
      throw new Error('Purchase not found')
    }
    if (doc.data()!.status === 'received') {
      throw new Error('Cannot delete a received purchase')
    }
    await doc.ref.delete()
  }

  async cancel(tenant: TenantContext, id: string): Promise<void> {
    const doc = await adminDb.collection('purchases').doc(id).get()
    if (!doc.exists || doc.data()!.organizationId !== tenant.organizationId) {
      throw new Error('Purchase not found')
    }
    if (doc.data()!.status !== 'draft') {
      throw new Error('Only draft purchases can be cancelled')
    }
    await doc.ref.update({
      status: 'cancelled' as PurchaseStatus,
      updatedBy: tenant.userId,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  /**
   * Atomic receive: for each line, write a stock-IN transaction tagged with
   * source='purchase' and update the parent purchase status. If a line is
   * missing itemId (e.g. an unresolved barcode), the receive is rejected
   * before any writes — the caller must resolve all items first.
   *
   * Also recomputes each affected item's `stockStatus` and (when the purchase
   * has updateItemUnitCost) updates the item's `unitCost` and `supplier`.
   *
   * Returns the list of (itemId, quantityAfter) pairs so the service can emit
   * audit + event records.
   */
  async receive(
    tenant: TenantContext,
    id: string,
  ): Promise<Array<{ itemId: string; quantityAfter: number }>> {
    const purchaseRef = adminDb.collection('purchases').doc(id)
    const purchaseSnap = await purchaseRef.get()
    if (!purchaseSnap.exists || purchaseSnap.data()!.organizationId !== tenant.organizationId) {
      throw new Error('Purchase not found')
    }
    const purchase = toPurchase(id, purchaseSnap.data()!)
    if (purchase.status !== 'draft') {
      throw new Error('Only draft purchases can be received')
    }
    const unresolved = purchase.lines.filter((l) => !l.itemId)
    if (unresolved.length > 0) {
      throw new Error(
        `Cannot receive — ${unresolved.length} line(s) have no resolved inventory item. ` +
          'Pick or create an item for each line first.',
      )
    }

    const itemIds = purchase.lines.map((l) => l.itemId as string)
    const uniqueItemIds = Array.from(new Set(itemIds))

    const itemRefs = uniqueItemIds.map((iid) => adminDb.collection('inventoryItems').doc(iid))

    return adminDb.runTransaction(async (t) => {
      const itemDocs = await Promise.all(itemRefs.map((r) => t.get(r)))
      const itemDataById = new Map<string, FirebaseFirestore.DocumentData>()
      itemDocs.forEach((doc, idx) => {
        const iid = uniqueItemIds[idx]
        if (!doc.exists || doc.data()!.organizationId !== tenant.organizationId) {
          throw new Error(`Inventory item not found: ${iid}`)
        }
        itemDataById.set(iid, doc.data()!)
      })

      // Compute current quantity per item by reading the most recent transaction.
      // We do this OUTSIDE the transaction read window because Firestore transactions
      // require all reads before any writes — and querying transactions to find latest
      // can't be done with `t.get()` for arbitrary queries.
      // Caveat: in a true high-concurrency scenario this could race. For v1 (single
      // cashier per session, occasional receives) this is acceptable. A stronger fix
      // would store cached quantityOnHand on the item and increment it transactionally.
      const finalQtyByItem = new Map<string, number>()

      for (const iid of uniqueItemIds) {
        const lastTxSnap = await adminDb
          .collection('inventoryTransactions')
          .where('itemId', '==', iid)
          .orderBy('performedAt', 'desc')
          .limit(1)
          .get()
        const cachedQty = itemDataById.get(iid)!.quantityOnHand ?? 0
        const currentQty = lastTxSnap.empty
          ? cachedQty
          : (lastTxSnap.docs[0].data().quantityAfter ?? cachedQty)
        finalQtyByItem.set(iid, currentQty)
      }

      const results: Array<{ itemId: string; quantityAfter: number }> = []

      // Apply each line.
      for (const line of purchase.lines) {
        const iid = line.itemId as string
        const itemData = itemDataById.get(iid)!
        const before = finalQtyByItem.get(iid) ?? 0
        const after = before + line.quantity
        finalQtyByItem.set(iid, after)
        results.push({ itemId: iid, quantityAfter: after })

        const txRef = adminDb.collection('inventoryTransactions').doc()
        t.set(txRef, {
          organizationId: tenant.organizationId,
          itemId: iid,
          itemName: line.itemName,
          type: 'in',
          quantity: line.quantity,
          quantityBefore: before,
          quantityAfter: after,
          reason: 'Purchase received',
          note: purchase.invoiceNumber ? `Invoice ${purchase.invoiceNumber}` : null,
          source: 'purchase',
          purchaseId: id,
          performedBy: tenant.userId,
          performedByEmail: tenant.user.email ?? null,
          performedByName: tenant.user.displayName ?? null,
          performedByRole: tenant.role ?? null,
          performedAt: FieldValue.serverTimestamp(),
        })
      }

      // Update each affected item with new stockStatus (and optional last-cost / supplier).
      for (const iid of uniqueItemIds) {
        const itemData = itemDataById.get(iid)!
        const threshold = itemData.minimumThreshold ?? 0
        const finalQty = finalQtyByItem.get(iid) ?? 0
        const statusUpdate: Record<string, unknown> = {
          stockStatus: finalQty === 0 ? 'out' : finalQty < threshold ? 'low' : 'ok',
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: tenant.userId,
          updatedByEmail: tenant.user.email ?? null,
          updatedByName: tenant.user.displayName ?? null,
        }
        if (purchase.updateItemUnitCost) {
          const matchingLine = purchase.lines.find((l) => l.itemId === iid)
          if (matchingLine) {
            statusUpdate.unitCost = matchingLine.unitCost
            statusUpdate.supplier = purchase.supplierName
          }
        }
        t.update(adminDb.collection('inventoryItems').doc(iid), statusUpdate)
      }

      t.update(purchaseRef, {
        status: 'received' as PurchaseStatus,
        receivedDate: new Date(),
        receivedBy: tenant.userId,
        receivedByName: tenant.user.displayName ?? null,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: tenant.userId,
      })

      return results
    })
  }
}
