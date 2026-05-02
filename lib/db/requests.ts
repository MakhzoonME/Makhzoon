import { adminDb } from '@/lib/firebase/admin';
import { Request } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function toRequest(id: string, data: FirebaseFirestore.DocumentData): Request {
  return {
    id,
    organizationId: data.organizationId,
    type: data.type,
    assetId: data.assetId,
    warrantyId: data.warrantyId,
    inventoryItemId: data.inventoryItemId,
    inventoryItemName: data.inventoryItemName,
    description: data.description,
    status: data.status,
    decisionBy: data.decisionBy,
    decisionAt: data.decisionAt instanceof Timestamp ? data.decisionAt.toDate() : undefined,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    createdBy: data.createdBy,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    updatedBy: data.updatedBy,
  };
}

async function enrichRequests(requests: Request[]): Promise<Request[]> {
  if (requests.length === 0) return requests;

  const assetIds = Array.from(new Set(requests.map((r) => r.assetId).filter(Boolean) as string[]));
  const inventoryItemIds = Array.from(new Set(requests.map((r) => r.inventoryItemId).filter(Boolean) as string[]));
  const userIds = Array.from(new Set(requests.map((r) => r.createdBy).filter(Boolean)));

  const [assetDocs, inventoryDocs, userDocs] = await Promise.all([
    assetIds.length > 0
      ? adminDb.getAll(...assetIds.map((id) => adminDb.collection('assets').doc(id)))
      : Promise.resolve([]),
    inventoryItemIds.length > 0
      ? adminDb.getAll(...inventoryItemIds.map((id) => adminDb.collection('inventoryItems').doc(id)))
      : Promise.resolve([]),
    userIds.length > 0
      ? adminDb.getAll(...userIds.map((id) => adminDb.collection('users').doc(id)))
      : Promise.resolve([]),
  ]);

  const assetNameMap = new Map<string, string>();
  assetDocs.forEach((doc) => {
    if (doc.exists) assetNameMap.set(doc.id, (doc.data() as { name: string }).name);
  });

  const inventoryNameMap = new Map<string, string>();
  inventoryDocs.forEach((doc) => {
    if (doc.exists) inventoryNameMap.set(doc.id, (doc.data() as { name: string }).name);
  });

  const userMap = new Map<string, { name?: string; email?: string }>();
  userDocs.forEach((doc) => {
    if (doc.exists) {
      const d = doc.data() as { displayName?: string; email?: string };
      userMap.set(doc.id, { name: d.displayName, email: d.email });
    }
  });

  return requests.map((r) => ({
    ...r,
    assetName: r.assetId ? assetNameMap.get(r.assetId) : undefined,
    inventoryItemName: r.inventoryItemId ? inventoryNameMap.get(r.inventoryItemId) : undefined,
    createdByName: userMap.get(r.createdBy)?.name,
    createdByEmail: userMap.get(r.createdBy)?.email,
  }));
}

type SortField = 'type' | 'status' | 'createdAt' | 'decisionAt';

export async function getRequests(
  orgId: string,
  opts?: {
    status?: string;
    type?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
    sortBy?: SortField;
    sortDir?: 'asc' | 'desc';
  }
): Promise<{ items: Request[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 10;
  const sortBy = opts?.sortBy ?? 'createdAt';
  const sortDir = opts?.sortDir ?? 'desc';

  let q = adminDb.collection('requests')
    .where('organizationId', '==', orgId);

  if (opts?.status) q = q.where('status', '==', opts.status) as typeof q;
  if (opts?.type) q = q.where('type', '==', opts.type) as typeof q;
  if (opts?.userId) q = q.where('createdBy', '==', opts.userId) as typeof q;

  const snap = await q.get();
  let requests = snap.docs.map((d) => toRequest(d.id, d.data()));

  requests = await enrichRequests(requests);

  const total = requests.length;

  requests.sort((a, b) => {
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
  const pagedItems = requests.slice(start, start + pageSize);

  return { items: pagedItems, total, page: safePage, pageSize, totalPages };
}

export async function getRequestById(id: string): Promise<Request | null> {
  const doc = await adminDb.collection('requests').doc(id).get();
  if (!doc.exists) return null;
  return toRequest(doc.id, doc.data()!);
}

export async function createRequest(data: Omit<Request, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date();
  const ref = await adminDb.collection('requests').add({
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateRequest(id: string, data: Partial<Request>): Promise<void> {
  await adminDb.collection('requests').doc(id).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
