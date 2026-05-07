import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface EarlyAccessEntry {
  id: string;
  email: string;
  ip: string | null;
  createdAt: Date;
}

function toEntry(id: string, data: FirebaseFirestore.DocumentData): EarlyAccessEntry {
  return {
    id,
    email: data.email,
    ip: data.ip ?? null,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  };
}

export async function createEarlyAccessEntry(email: string, ip: string | null): Promise<string> {
  const ref = await adminDb.collection('earlyAccess').add({
    email: email.toLowerCase(),
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
