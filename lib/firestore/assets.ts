import { adminDb } from '@/lib/firebase/admin';
import { Asset } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function toAsset(id: string, data: FirebaseFirestore.DocumentData): Asset {
  return {
    id,
    organizationId: data.organizationId,
    name: data.name,
    category: data.category,
    status: data.status,
    serialNumber: data.serialNumber,
    purchaseDate: data.purchaseDate instanceof Timestamp ? data.purchaseDate.toDate() : data.purchaseDate,
    purchaseCost: data.purchaseCost,
    assignedTo: data.assignedTo,
    location: data.location,
    notes: data.notes,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    createdBy: data.createdBy,
    createdByEmail: data.createdByEmail,
    createdByName: data.createdByName,
    createdByRole: data.createdByRole,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    updatedBy: data.updatedBy,
    updatedByEmail: data.updatedByEmail,
    updatedByName: data.updatedByName,
    updatedByRole: data.updatedByRole,
  };
}

const LIST_SELECT_FIELDS = [
  'id', 'organizationId', 'name', 'category', 'status', 'serialNumber',
  'assignedTo', 'location', 'purchaseDate', 'purchaseCost',
  'createdAt', 'createdBy', 'createdByEmail', 'createdByName', 'createdByRole',
  'updatedAt', 'updatedBy', 'updatedByEmail', 'updatedByName', 'updatedByRole',
];

export async function getAssets(
  orgId: string,
  opts?: { status?: string; category?: string; search?: string; limit?: number; cursor?: string }
): Promise<{ items: Asset[]; nextCursor: string | null }> {
  const pageSize = opts?.limit ?? 50;

  let q = adminDb.collection('assets')
    .where('organizationId', '==', orgId)
    .orderBy('createdAt', 'desc')
    .select(...LIST_SELECT_FIELDS);

  if (opts?.status) q = q.where('status', '==', opts.status) as typeof q;
  if (opts?.category) q = q.where('category', '==', opts.category) as typeof q;

  // When searching, fetch all matching docs and filter in-memory
  if (opts?.search) {
    const snap = await q.get();
    const term = opts.search.toLowerCase();
    const all = snap.docs
      .map((d) => toAsset(d.id, d.data()))
      .filter((a) =>
        (a.name ?? '').toLowerCase().includes(term) ||
        (a.serialNumber ?? '').toLowerCase().includes(term) ||
        (a.assignedTo ?? '').toLowerCase().includes(term) ||
        (a.location ?? '').toLowerCase().includes(term) ||
        (a.category ?? '').toLowerCase().includes(term)
      );

    // Manual cursor pagination over the filtered set
    let startIdx = 0;
    if (opts.cursor) {
      const idx = all.findIndex((a) => a.id === opts.cursor);
      if (idx !== -1) startIdx = idx + 1;
    }
    const page = all.slice(startIdx, startIdx + pageSize);
    const nextCursor = page.length === pageSize && startIdx + pageSize < all.length
      ? page[page.length - 1].id
      : null;
    return { items: page, nextCursor };
  }

  // Cursor-based pagination via Firestore startAfter
  if (opts?.cursor) {
    const cursorDoc = await adminDb.collection('assets').doc(opts.cursor).get();
    if (cursorDoc.exists) {
      q = q.startAfter(cursorDoc) as typeof q;
    }
  }

  q = q.limit(pageSize + 1) as typeof q;
  const snap = await q.get();
  const docs = snap.docs.slice(0, pageSize);
  const hasMore = snap.docs.length > pageSize;
  const items = docs.map((d) => toAsset(d.id, d.data()));
  const nextCursor = hasMore ? docs[docs.length - 1].id : null;
  return { items, nextCursor };
}

export async function getAssetById(id: string): Promise<Asset | null> {
  const doc = await adminDb.collection('assets').doc(id).get();
  if (!doc.exists) return null;
  return toAsset(doc.id, doc.data()!);
}

export async function createAsset(data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await adminDb.collection('assets').add({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateAsset(id: string, data: Partial<Asset>): Promise<void> {
  await adminDb.collection('assets').doc(id).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function getAssetCategories(orgId: string): Promise<string[]> {
  const snap = await adminDb.collection('assets')
    .where('organizationId', '==', orgId)
    .select('category')
    .get();
  const cats = new Set(snap.docs.map((d) => d.data().category as string));
  return Array.from(cats).sort();
}
