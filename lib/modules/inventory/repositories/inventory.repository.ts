import { adminDb } from '@/lib/firebase/admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { InventoryItem, InventoryTransaction, StockStatus, TransactionType } from '../types'

function stockStatus(qty: number, threshold: number): StockStatus {
  if (qty === 0) return 'out'
  if (qty < threshold) return 'low'
  return 'ok'
}

function toItem(id: string, d: FirebaseFirestore.DocumentData, computedQty?: number): InventoryItem {
  const qty = computedQty ?? d.quantityOnHand ?? 0
  const threshold = d.minimumThreshold ?? 0
  return {
    id,
    organizationId: d.organizationId,
    name: d.name,
    category: d.category,
    sku: d.sku,
    unit: d.unit,
    quantityOnHand: qty,
    minimumThreshold: threshold,
    reorderQuantity: d.reorderQuantity,
    location: d.location,
    supplier: d.supplier,
    unitCost: d.unitCost,
    notes: d.notes,
    stockStatus: stockStatus(qty, threshold),
    posEnabled: d.posEnabled,
    barcode: d.barcode ?? null,
    taxRateId: d.taxRateId ?? null,
    posPrice: d.posPrice ?? null,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
    createdBy: d.createdBy,
    createdByEmail: d.createdByEmail,
    createdByName: d.createdByName,
    updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : new Date(),
    updatedBy: d.updatedBy,
    updatedByEmail: d.updatedByEmail,
    updatedByName: d.updatedByName,
  }
}

function toTransaction(id: string, d: FirebaseFirestore.DocumentData): InventoryTransaction {
  return {
    id,
    organizationId: d.organizationId,
    itemId: d.itemId,
    itemName: d.itemName,
    type: d.type,
    quantity: d.quantity,
    quantityBefore: d.quantityBefore,
    quantityAfter: d.quantityAfter,
    reason: d.reason,
    note: d.note,
    performedAt: d.performedAt instanceof Timestamp ? d.performedAt.toDate() : new Date(),
    performedBy: d.performedBy,
    performedByEmail: d.performedByEmail,
    performedByName: d.performedByName,
    performedByRole: d.performedByRole,
  }
}

async function computeQuantity(itemId: string, fallback: number): Promise<number> {
  const snap = await adminDb
    .collection('inventoryTransactions')
    .where('itemId', '==', itemId)
    .orderBy('performedAt', 'desc')
    .limit(1)
    .get()
  if (snap.empty) return fallback
  return snap.docs[0].data().quantityAfter ?? fallback
}

type SortField = 'name' | 'category' | 'stockStatus' | 'quantityOnHand' | 'minimumThreshold' | 'location' | 'supplier' | 'unitCost' | 'createdAt'

export interface GetAllOpts {
  category?: string
  stockStatus?: string
  search?: string
  page?: number
  pageSize?: number
  sortBy?: SortField
  sortDir?: 'asc' | 'desc'
}

export class InventoryRepository {
  async getAll(
    tenant: TenantContext,
    opts?: GetAllOpts
  ): Promise<{ items: InventoryItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 10
    const sortBy = opts?.sortBy ?? 'createdAt'
    const sortDir = opts?.sortDir ?? 'desc'

    const snap = await adminDb
      .collection('inventoryItems')
      .where('organizationId', '==', tenant.organizationId)
      .get()

    let items: InventoryItem[] = snap.docs.map((d) => toItem(d.id, d.data()))

    if (opts?.category) {
      items = items.filter((i) => i.category === opts.category)
    }
    if (opts?.stockStatus) {
      items = items.filter((i) => i.stockStatus === opts.stockStatus)
    }
    if (opts?.search) {
      const term = opts.search.toLowerCase()
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(term) ||
          (i.category ?? '').toLowerCase().includes(term) ||
          (i.sku ?? '').toLowerCase().includes(term) ||
          (i.location ?? '').toLowerCase().includes(term)
      )
    }

    const total = items.length

    items.sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]
      const mult = sortDir === 'asc' ? 1 : -1
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return mult
      if (bVal == null) return -mult
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * mult
      return String(aVal).localeCompare(String(bVal)) * mult
    })

    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    const pagedItems = items.slice(start, start + pageSize)

    return { items: pagedItems, total, page: safePage, pageSize, totalPages }
  }

  async getById(tenant: TenantContext, id: string): Promise<InventoryItem | null> {
    const doc = await adminDb.collection('inventoryItems').doc(id).get()
    if (!doc.exists) return null
    const d = doc.data()!
    if (d.organizationId !== tenant.organizationId) return null
    const qty = await computeQuantity(id, d.quantityOnHand ?? 0)
    return toItem(id, d, qty)
  }

  async getCategories(tenant: TenantContext): Promise<string[]> {
    const snap = await adminDb
      .collection('inventoryItems')
      .where('organizationId', '==', tenant.organizationId)
      .select('category')
      .get()
    const cats = new Set(snap.docs.map((d) => d.data().category as string))
    return Array.from(cats).sort()
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
    }
  ): Promise<string> {
    const now = new Date()
    const ref = await adminDb.collection('inventoryItems').add({
      organizationId: tenant.organizationId,
      name: input.name,
      category: input.category,
      sku: input.sku ?? null,
      unit: input.unit,
      minimumThreshold: input.minimumThreshold,
      reorderQuantity: input.reorderQuantity ?? null,
      location: input.location ?? null,
      supplier: input.supplier ?? null,
      unitCost: input.unitCost ?? null,
      notes: input.notes ?? null,
      // quantityOnHand intentionally NOT stored — computed from transactions
      createdBy: tenant.userId,
      createdByEmail: tenant.user.email ?? null,
      createdByName: tenant.user.displayName ?? null,
      updatedBy: tenant.userId,
      updatedByEmail: tenant.user.email ?? null,
      updatedByName: tenant.user.displayName ?? null,
      createdAt: now,
      updatedAt: now,
    })

    // If there's an opening balance, record it as an initial 'in' transaction
    // and update the cached stockStatus on the item
    if (input.quantityOnHand > 0) {
      await adminDb.runTransaction(async (t) => {
        const txRef = adminDb.collection('inventoryTransactions').doc()
        t.set(txRef, {
          organizationId: tenant.organizationId,
          itemId: ref.id,
          itemName: input.name,
          type: 'in',
          quantity: input.quantityOnHand,
          quantityBefore: 0,
          quantityAfter: input.quantityOnHand,
          reason: 'Opening balance',
          note: null,
          performedBy: tenant.userId,
          performedByEmail: tenant.user.email ?? null,
          performedByName: tenant.user.displayName ?? null,
          performedByRole: tenant.role ?? null,
          performedAt: FieldValue.serverTimestamp(),
        })
        t.update(ref, {
          stockStatus: stockStatus(input.quantityOnHand, input.minimumThreshold),
        })
      })
    }

    return ref.id
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
    }
  ): Promise<void> {
    const doc = await adminDb.collection('inventoryItems').doc(id).get()
    if (!doc.exists || doc.data()!.organizationId !== tenant.organizationId) {
      throw new Error('Inventory item not found')
    }

    await adminDb.collection('inventoryItems').doc(id).update({
      ...input,
      updatedBy: tenant.userId,
      updatedByEmail: tenant.user.email ?? null,
      updatedByName: tenant.user.displayName ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  async delete(tenant: TenantContext, id: string): Promise<void> {
    const doc = await adminDb.collection('inventoryItems').doc(id).get()
    if (!doc.exists || doc.data()!.organizationId !== tenant.organizationId) {
      throw new Error('Inventory item not found')
    }
    await adminDb.collection('inventoryItems').doc(id).delete()
  }

  async getTransactions(tenant: TenantContext, itemId: string): Promise<InventoryTransaction[]> {
    // Verify ownership
    const doc = await adminDb.collection('inventoryItems').doc(itemId).get()
    if (!doc.exists || doc.data()!.organizationId !== tenant.organizationId) {
      throw new Error('Inventory item not found')
    }

    const snap = await adminDb
      .collection('inventoryTransactions')
      .where('itemId', '==', itemId)
      .orderBy('performedAt', 'desc')
      .limit(100)
      .get()
    return snap.docs.map((d) => toTransaction(d.id, d.data()))
  }

  async applyTransaction(
    tenant: TenantContext,
    itemId: string,
    type: TransactionType,
    quantity: number,
    reason: string,
    note?: string
  ): Promise<{ quantityAfter: number }> {
    const doc = await adminDb.collection('inventoryItems').doc(itemId).get()
    if (!doc.exists || doc.data()!.organizationId !== tenant.organizationId) {
      throw new Error('Inventory item not found')
    }

    const currentQty = await computeQuantity(itemId, doc.data()!.quantityOnHand ?? 0)
    const minimumThreshold: number = doc.data()!.minimumThreshold ?? 0

    let newQty: number
    if (type === 'in') newQty = currentQty + quantity
    else if (type === 'out') newQty = Math.max(0, currentQty - quantity)
    else newQty = quantity // adjustment

    await adminDb.runTransaction(async (t) => {
      const txRef = adminDb.collection('inventoryTransactions').doc()
      t.set(txRef, {
        organizationId: tenant.organizationId,
        itemId,
        itemName: doc.data()!.name,
        type,
        quantity,
        quantityBefore: currentQty,
        quantityAfter: newQty,
        reason,
        note: note ?? null,
        performedBy: tenant.userId,
        performedByEmail: tenant.user.email ?? null,
        performedByName: tenant.user.displayName ?? null,
        performedByRole: tenant.role ?? null,
        performedAt: FieldValue.serverTimestamp(),
      })

      // Update cached stockStatus on the item (quantityOnHand is NOT stored)
      const itemRef = adminDb.collection('inventoryItems').doc(itemId)
      t.update(itemRef, {
        stockStatus: stockStatus(newQty, minimumThreshold),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: tenant.userId,
        updatedByEmail: tenant.user.email ?? null,
        updatedByName: tenant.user.displayName ?? null,
      })
    })

    return { quantityAfter: newQty }
  }
}
