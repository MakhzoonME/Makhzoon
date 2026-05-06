import { adminDb } from '@/lib/firebase/admin';
import { Warranty } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function toWarranty(id: string, data: FirebaseFirestore.DocumentData): Warranty {
  return {
    id,
    organizationId: data.organizationId,
    assetId: data.assetId,
    vendor: data.vendor,
    startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(data.startDate),
    endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : new Date(data.endDate),
    reminder: data.reminder ?? true,
    notes: data.notes,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    createdBy: data.createdBy,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    updatedBy: data.updatedBy,
  };
}

async function attachAssetNames(warranties: Warranty[]): Promise<Warranty[]> {
  const uniqueAssetIds = Array.from(new Set(warranties.map((w) => w.assetId)));
  if (uniqueAssetIds.length === 0) return warranties;

  const refs = uniqueAssetIds.map((id) => adminDb.collection('assets').doc(id));
  const assetDocs = await adminDb.getAll(...refs);
  const nameMap = new Map<string, string>();
  assetDocs.forEach((doc) => {
    if (doc.exists) nameMap.set(doc.id, (doc.data() as { name: string }).name);
  });

  return warranties.map((w) => ({ ...w, assetName: nameMap.get(w.assetId) }));
}

type SortField = 'vendor' | 'startDate' | 'endDate' | 'assetId' | 'createdAt';

export async function getWarranties(
  orgId: string,
  opts?: {
    status?: string;
    assetId?: string;
    page?: number;
    pageSize?: number;
    sortBy?: SortField;
    sortDir?: 'asc' | 'desc';
  }
): Promise<{ items: Warranty[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 10;
  const sortBy = opts?.sortBy ?? 'createdAt';
  const sortDir = opts?.sortDir ?? 'desc';

  let q = adminDb.collection('warranties')
    .where('organizationId', '==', orgId);

  if (opts?.assetId) q = q.where('assetId', '==', opts.assetId) as typeof q;

  const snap = await q.get();
  let warranties = snap.docs.map((d) => toWarranty(d.id, d.data()));

  if (opts?.status) {
    const now = new Date();
    warranties = warranties.filter((w) => {
      if (opts.status === 'active') return w.endDate >= now;
      if (opts.status === 'expired') return w.endDate < now;
      return true;
    });
  }

  warranties = await attachAssetNames(warranties);

  const total = warranties.length;

  warranties.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    const mult = sortDir === 'asc' ? 1 : -1;

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return mult;
    if (bVal == null) return -mult;

    if (aVal instanceof Date && bVal instanceof Date) {
      return (aVal.getTime() - bVal.getTime()) * mult;
    }
    return String(aVal).localeCompare(String(bVal)) * mult;
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pagedItems = warranties.slice(start, start + pageSize);

  return { items: pagedItems, total, page: safePage, pageSize, totalPages };
}

export async function getWarrantyById(id: string): Promise<Warranty | null> {
  const doc = await adminDb.collection('warranties').doc(id).get();
  if (!doc.exists) return null;
  return toWarranty(doc.id, doc.data()!);
}

export async function createWarranty(data: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date();
  const ref = await adminDb.collection('warranties').add({
    ...data,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateWarranty(id: string, data: Partial<Warranty>): Promise<void> {
  await adminDb.collection('warranties').doc(id).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteWarranty(id: string): Promise<void> {
  await adminDb.collection('warranties').doc(id).delete();
}

export async function getExpiringWarranties(orgId: string, days = 30): Promise<Warranty[]> {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const snap = await adminDb.collection('warranties')
    .where('organizationId', '==', orgId)
    .where('endDate', '>=', now)
    .where('endDate', '<=', future)
    .orderBy('endDate', 'asc')
    .get();
  const warranties = snap.docs.map((d) => toWarranty(d.id, d.data()));
  return attachAssetNames(warranties);
}
