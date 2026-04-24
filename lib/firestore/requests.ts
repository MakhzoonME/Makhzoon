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

  // Batch-fetch asset names
  const assetIds = Array.from(new Set(requests.map((r) => r.assetId).filter(Boolean) as string[]));
  const userIds = Array.from(new Set(requests.map((r) => r.createdBy).filter(Boolean)));

  const [assetDocs, userDocs] = await Promise.all([
    assetIds.length > 0
      ? adminDb.getAll(...assetIds.map((id) => adminDb.collection('assets').doc(id)))
      : Promise.resolve([]),
    userIds.length > 0
      ? adminDb.getAll(...userIds.map((id) => adminDb.collection('users').doc(id)))
      : Promise.resolve([]),
  ]);

  const assetNameMap = new Map<string, string>();
  assetDocs.forEach((doc) => {
    if (doc.exists) assetNameMap.set(doc.id, (doc.data() as { name: string }).name);
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
    createdByName: userMap.get(r.createdBy)?.name,
    createdByEmail: userMap.get(r.createdBy)?.email,
  }));
}

export async function getRequests(orgId: string, opts?: { status?: string; type?: string; userId?: string }): Promise<Request[]> {
  let q = adminDb.collection('requests')
    .where('organizationId', '==', orgId)
    .orderBy('createdAt', 'desc')
    .limit(50);

  if (opts?.status) q = q.where('status', '==', opts.status) as typeof q;
  if (opts?.userId) q = q.where('createdBy', '==', opts.userId) as typeof q;

  const snap = await q.get();
  const requests = snap.docs.map((d) => toRequest(d.id, d.data()));
  return enrichRequests(requests);
}

export async function getRequestById(id: string): Promise<Request | null> {
  const doc = await adminDb.collection('requests').doc(id).get();
  if (!doc.exists) return null;
  return toRequest(doc.id, doc.data()!);
}

export async function createRequest(data: Omit<Request, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await adminDb.collection('requests').add({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateRequest(id: string, data: Partial<Request>): Promise<void> {
  await adminDb.collection('requests').doc(id).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
