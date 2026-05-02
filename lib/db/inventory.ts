import { adminDb } from '@/lib/firebase/admin';
import { InventoryItem, InventoryTransaction, StockStatus } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function stockStatus(qty: number, threshold: number): StockStatus {
  if (qty === 0) return 'out';
  if (qty < threshold) return 'low';
  return 'ok';
}

function toItem(id: string, d: FirebaseFirestore.DocumentData): InventoryItem {
  return {
    id,
    organizationId: d.organizationId,
    name: d.name,
    category: d.category,
    sku: d.sku,
    unit: d.unit,
    quantityOnHand: d.quantityOnHand ?? 0,
    minimumThreshold: d.minimumThreshold ?? 0,
    reorderQuantity: d.reorderQuantity,
    location: d.location,
    supplier: d.supplier,
    unitCost: d.unitCost,
    notes: d.notes,
    stockStatus: d.stockStatus ?? stockStatus(d.quantityOnHand ?? 0, d.minimumThreshold ?? 0),
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
    createdBy: d.createdBy,
    createdByEmail: d.createdByEmail,
    createdByName: d.createdByName,
    updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : new Date(),
    updatedBy: d.updatedBy,
    updatedByEmail: d.updatedByEmail,
    updatedByName: d.updatedByName,
  };
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
  };
}

type SortField = 'name' | 'category' | 'stockStatus' | 'quantityOnHand' | 'minimumThreshold' | 'location' | 'supplier' | 'unitCost' | 'createdAt';

export async function getInventoryItems(
  orgId: string,
  opts?: {
    category?: string;
    stockStatus?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: SortField;
    sortDir?: 'asc' | 'desc';
  }
): Promise<{ items: InventoryItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 10;
  const sortBy = opts?.sortBy ?? 'createdAt';
  const sortDir = opts?.sortDir ?? 'desc';

  const snap = await adminDb.collection('inventoryItems')
    .where('organizationId', '==', orgId)
    .get();

  let items = snap.docs.map((d) => toItem(d.id, d.data()));

  if (opts?.category) items = items.filter((i) => i.category === opts.category);
  if (opts?.stockStatus) items = items.filter((i) => i.stockStatus === opts.stockStatus);

  if (opts?.search) {
    const term = opts.search.toLowerCase();
    items = items.filter((i) =>
      i.name.toLowerCase().includes(term) ||
      (i.category ?? '').toLowerCase().includes(term) ||
      (i.sku ?? '').toLowerCase().includes(term) ||
      (i.location ?? '').toLowerCase().includes(term)
    );
  }

  const total = items.length;

  items.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    const mult = sortDir === 'asc' ? 1 : -1;

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return mult;
    if (bVal == null) return -mult;

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * mult;
    }
    return String(aVal).localeCompare(String(bVal)) * mult;
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pagedItems = items.slice(start, start + pageSize);

  return { items: pagedItems, total, page: safePage, pageSize, totalPages };
}

export async function getInventoryItemById(id: string): Promise<InventoryItem | null> {
  const doc = await adminDb.collection('inventoryItems').doc(id).get();
  if (!doc.exists) return null;
  return toItem(doc.id, doc.data()!);
}

export async function createInventoryItem(
  data: Omit<InventoryItem, 'id' | 'stockStatus' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const status = stockStatus(data.quantityOnHand, data.minimumThreshold);
  const now = new Date();
  const ref = await adminDb.collection('inventoryItems').add({
    ...data,
    stockStatus: status,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateInventoryItem(id: string, data: Partial<InventoryItem>): Promise<void> {
  const update: Record<string, unknown> = { ...data, updatedAt: FieldValue.serverTimestamp() };

  if (data.quantityOnHand !== undefined || data.minimumThreshold !== undefined) {
    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(adminDb.collection('inventoryItems').doc(id));
      if (!doc.exists) throw new Error(`Inventory item ${id} not found`);

      const current = doc.data()!;
      const qty = data.quantityOnHand ?? current.quantityOnHand ?? 0;
      const threshold = data.minimumThreshold ?? current.minimumThreshold ?? 0;
      update.stockStatus = stockStatus(qty, threshold);

      transaction.update(doc.ref, update);
    });
  } else {
    await adminDb.collection('inventoryItems').doc(id).update(update);
  }
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await adminDb.collection('inventoryItems').doc(id).delete();
}

export async function getInventoryCategories(orgId: string): Promise<string[]> {
  const snap = await adminDb.collection('inventoryItems')
    .where('organizationId', '==', orgId)
    .select('category')
    .get();
  const cats = new Set(snap.docs.map((d) => d.data().category as string));
  return Array.from(cats).sort();
}

export async function getInventoryTransactions(itemId: string): Promise<InventoryTransaction[]> {
  const snap = await adminDb.collection('inventoryTransactions')
    .where('itemId', '==', itemId)
    .orderBy('performedAt', 'desc')
    .limit(100)
    .get();
  return snap.docs.map((d) => toTransaction(d.id, d.data()));
}

export async function createInventoryTransaction(
  tx: Omit<InventoryTransaction, 'id' | 'performedAt'>
): Promise<string> {
  const ref = await adminDb.collection('inventoryTransactions').add({
    ...tx,
    performedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function applyInventoryTransaction(
  itemId: string,
  type: 'in' | 'out' | 'adjustment',
  quantity: number,
  actor: { uid: string; email?: string; displayName?: string; role?: string },
  reason: string,
  note?: string
): Promise<{ quantityAfter: number }> {
  const item = await getInventoryItemById(itemId);
  if (!item) throw new Error('Item not found');

  let newQty: number;
  if (type === 'in') newQty = item.quantityOnHand + quantity;
  else if (type === 'out') newQty = Math.max(0, item.quantityOnHand - quantity);
  else newQty = quantity;

  await adminDb.runTransaction(async (t) => {
    const ref = adminDb.collection('inventoryItems').doc(itemId);
    const status = stockStatus(newQty, item.minimumThreshold);
    t.update(ref, { quantityOnHand: newQty, stockStatus: status, updatedAt: FieldValue.serverTimestamp() });

    const txRef = adminDb.collection('inventoryTransactions').doc();
    t.set(txRef, {
      organizationId: item.organizationId,
      itemId,
      itemName: item.name,
      type,
      quantity,
      quantityBefore: item.quantityOnHand,
      quantityAfter: newQty,
      reason,
      note: note || null,
      performedBy: actor.uid,
      performedByEmail: actor.email ?? null,
      performedByName: actor.displayName ?? null,
      performedByRole: actor.role ?? null,
      performedAt: FieldValue.serverTimestamp(),
    });
  });

  return { quantityAfter: newQty };
}
