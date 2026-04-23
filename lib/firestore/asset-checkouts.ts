import { adminDb } from '@/lib/firebase/admin';
import { AssetCheckout } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function toCheckout(id: string, data: FirebaseFirestore.DocumentData): AssetCheckout {
  return {
    id,
    organizationId: data.organizationId,
    assetId: data.assetId,
    checkedOutTo: data.checkedOutTo,
    checkedOutBy: data.checkedOutBy,
    checkedOutByEmail: data.checkedOutByEmail,
    dueDate: data.dueDate instanceof Timestamp ? data.dueDate.toDate() : data.dueDate ? new Date(data.dueDate) : undefined,
    notes: data.notes,
    checkedOutAt: data.checkedOutAt instanceof Timestamp ? data.checkedOutAt.toDate() : new Date(),
    returnedAt: data.returnedAt instanceof Timestamp ? data.returnedAt.toDate() : data.returnedAt ? new Date(data.returnedAt) : undefined,
    returnedBy: data.returnedBy,
    returnedByEmail: data.returnedByEmail,
  };
}

export async function getCheckouts(orgId: string, opts?: { assetId?: string; activeOnly?: boolean }): Promise<AssetCheckout[]> {
  let q = adminDb.collection('assetCheckouts')
    .where('organizationId', '==', orgId)
    .orderBy('checkedOutAt', 'desc') as FirebaseFirestore.Query;
  if (opts?.assetId) q = q.where('assetId', '==', opts.assetId);
  const snap = await q.get();
  let results = snap.docs.map((d) => toCheckout(d.id, d.data()));
  if (opts?.activeOnly) results = results.filter((c) => !c.returnedAt);
  return results;
}

export async function getActiveCheckoutForAsset(orgId: string, assetId: string): Promise<AssetCheckout | null> {
  const snap = await adminDb.collection('assetCheckouts')
    .where('organizationId', '==', orgId)
    .where('assetId', '==', assetId)
    .orderBy('checkedOutAt', 'desc')
    .limit(1)
    .get();
  if (snap.empty) return null;
  const c = toCheckout(snap.docs[0].id, snap.docs[0].data());
  return c.returnedAt ? null : c;
}

export async function getCheckoutById(id: string): Promise<AssetCheckout | null> {
  const doc = await adminDb.collection('assetCheckouts').doc(id).get();
  if (!doc.exists) return null;
  return toCheckout(doc.id, doc.data()!);
}

export async function createCheckout(
  data: Omit<AssetCheckout, 'id' | 'checkedOutAt' | 'returnedAt' | 'returnedBy' | 'returnedByEmail'>
): Promise<string> {
  const ref = await adminDb.collection('assetCheckouts').add({
    ...data,
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    checkedOutAt: FieldValue.serverTimestamp(),
    returnedAt: null,
  });
  return ref.id;
}

export async function markReturned(
  id: string,
  params: { returnedBy: string; returnedByEmail: string }
): Promise<void> {
  await adminDb.collection('assetCheckouts').doc(id).update({
    returnedAt: FieldValue.serverTimestamp(),
    returnedBy: params.returnedBy,
    returnedByEmail: params.returnedByEmail,
  });
}

export async function countActiveCheckouts(orgId: string): Promise<number> {
  const snap = await adminDb.collection('assetCheckouts')
    .where('organizationId', '==', orgId)
    .get();
  return snap.docs.filter((d) => !d.data().returnedAt).length;
}
