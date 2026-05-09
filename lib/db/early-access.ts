import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface EarlyAccessEntry {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  ip: string | null;
  createdAt: string;
}

function toEntry(id: string, data: FirebaseFirestore.DocumentData): EarlyAccessEntry {
  const ts = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt);
  return {
    id,
    email: data.email,
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    ip: data.ip ?? null,
    createdAt: ts.toISOString(),
  };
}

export async function createEarlyAccessEntry(email: string, ip: string | null, firstName?: string, lastName?: string): Promise<string> {
  const ref = await adminDb.collection('earlyAccess').add({
    email: email.toLowerCase(),
    firstName: firstName ?? '',
    lastName: lastName ?? '',
    ip,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function getEarlyAccessEntries(): Promise<EarlyAccessEntry[]> {
  const snap = await adminDb
    .collection('earlyAccess')
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((d) => toEntry(d.id, d.data()));
}
