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

export async function getWarranties(orgId: string, opts?: { status?: string; assetId?: string }): Promise<Warranty[]> {
  let q = adminDb.collection('warranties')
    .where('organizationId', '==', orgId)
    .orderBy('endDate', 'asc');

  if (opts?.assetId) q = q.where('assetId', '==', opts.assetId) as typeof q;

  const snap = await q.get();
  return snap.docs.map((d) => toWarranty(d.id, d.data()));
}

export async function getWarrantyById(id: string): Promise<Warranty | null> {
  const doc = await adminDb.collection('warranties').doc(id).get();
  if (!doc.exists) return null;
  return toWarranty(doc.id, doc.data()!);
}

export async function createWarranty(data: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await adminDb.collection('warranties').add({
    ...data,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
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
  return snap.docs.map((d) => toWarranty(d.id, d.data()));
}
