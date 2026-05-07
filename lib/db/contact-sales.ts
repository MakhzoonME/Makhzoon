import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface ContactSalesEntry {
  id: string;
  name: string;
  organizationName: string;
  phone: string;
  email: string;
  notes: string | null;
  ip: string | null;
  createdAt: Date;
}

function toEntry(id: string, data: FirebaseFirestore.DocumentData): ContactSalesEntry {
  return {
    id,
    name: data.name,
    organizationName: data.organizationName,
    phone: data.phone,
    email: data.email,
    notes: data.notes ?? null,
    ip: data.ip ?? null,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  };
}

export async function createContactSalesEntry(data: {
  name: string;
  organizationName: string;
  phone: string;
  email: string;
  notes?: string;
  ip: string | null;
}): Promise<string> {
  const ref = await adminDb.collection('contactSales').add({
    ...data,
    email: data.email.toLowerCase(),
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function getContactSalesEntries(): Promise<ContactSalesEntry[]> {
  const snap = await adminDb
    .collection('contactSales')
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((d) => toEntry(d.id, d.data()));
}
