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
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    updatedBy: data.updatedBy,
    updatedByEmail: data.updatedByEmail,
  };
}

export async function getAssets(
  orgId: string,
  opts?: { status?: string; category?: string; limit?: number; startAfter?: string }
): Promise<Asset[]> {
  let q = adminDb.collection('assets')
    .where('organizationId', '==', orgId)
    .orderBy('createdAt', 'desc')
    .limit(opts?.limit ?? 25);

  if (opts?.status) q = q.where('status', '==', opts.status) as typeof q;
  if (opts?.category) q = q.where('category', '==', opts.category) as typeof q;

  const snap = await q.get();
  return snap.docs.map((d) => toAsset(d.id, d.data()));
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
