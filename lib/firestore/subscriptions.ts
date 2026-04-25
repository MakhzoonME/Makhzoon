import { adminDb } from '@/lib/firebase/admin';
import { Subscription } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function toSubscription(id: string, data: FirebaseFirestore.DocumentData): Subscription {
  return {
    id,
    organizationId: data.organizationId,
    packageId: data.packageId ?? null,
    features: data.features ?? {},
    notes: data.notes ?? null,
    packageDetails: data.packageDetails ?? {},
    startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(data.startDate),
    endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : new Date(data.endDate),
    status: data.status,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    createdBy: data.createdBy,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    updatedBy: data.updatedBy,
  };
}

export async function getSubscriptionByOrg(orgId: string): Promise<Subscription | null> {
  const snap = await adminDb.collection('subscriptions')
    .where('organizationId', '==', orgId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return toSubscription(doc.id, doc.data());
}

export async function createSubscription(data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await adminDb.collection('subscriptions').add({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateSubscription(id: string, data: Partial<Subscription>): Promise<void> {
  await adminDb.collection('subscriptions').doc(id).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function getSubscriptionsByOrgs(orgIds: string[]): Promise<Subscription[]> {
  if (orgIds.length === 0) return [];
  const unique = Array.from(new Set(orgIds));
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 10) chunks.push(unique.slice(i, i + 10));
  const results: Subscription[] = [];
  for (const chunk of chunks) {
    const snap = await adminDb
      .collection('subscriptions')
      .where('organizationId', 'in', chunk)
      .get();
    results.push(...snap.docs.map((d) => toSubscription(d.id, d.data())));
  }
  return results;
}
