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

type SortField = 'name' | 'category' | 'status' | 'serialNumber' | 'assignedTo' | 'location' | 'purchaseDate' | 'purchaseCost' | 'createdAt' | 'updatedAt';

export async function getAssets(
  orgId: string,
  opts?: {
    status?: string;
    category?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: SortField;
    sortDir?: 'asc' | 'desc';
  }
): Promise<{ items: Asset[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 10;
  const sortBy = opts?.sortBy ?? 'createdAt';
  const sortDir = opts?.sortDir ?? 'desc';

  let q = adminDb.collection('assets')
    .where('organizationId', '==', orgId)
    .select(...LIST_SELECT_FIELDS);

  if (opts?.status) q = q.where('status', '==', opts.status) as typeof q;
  if (opts?.category) q = q.where('category', '==', opts.category) as typeof q;

  const snap = await q.get();
  let items = snap.docs.map((d) => toAsset(d.id, d.data()));

  if (opts?.search) {
    const term = opts.search.toLowerCase();
    items = items.filter((a) =>
      (a.name ?? '').toLowerCase().includes(term) ||
      (a.serialNumber ?? '').toLowerCase().includes(term) ||
      (a.assignedTo ?? '').toLowerCase().includes(term) ||
      (a.location ?? '').toLowerCase().includes(term) ||
      (a.category ?? '').toLowerCase().includes(term)
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

    if (aVal instanceof Date && bVal instanceof Date) {
      return (aVal.getTime() - bVal.getTime()) * mult;
    }
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

export async function getAssetById(id: string): Promise<Asset | null> {
  const doc = await adminDb.collection('assets').doc(id).get();
  if (!doc.exists) return null;
  return toAsset(doc.id, doc.data()!);
}

export async function createAsset(data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date();
  const ref = await adminDb.collection('assets').add({
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateAsset(id: string, data: Partial<Asset>): Promise<void> {
  await adminDb.collection('assets').doc(id).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteAsset(id: string): Promise<void> {
  await adminDb.collection('assets').doc(id).delete();
}

export async function getAssetCategories(orgId: string): Promise<string[]> {
  const snap = await adminDb.collection('assets')
    .where('organizationId', '==', orgId)
    .select('category')
    .get();
  const cats = new Set(snap.docs.map((d) => d.data().category as string));
  return Array.from(cats).sort();
}
