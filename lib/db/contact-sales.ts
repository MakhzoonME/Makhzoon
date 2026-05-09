import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface ContactSalesEntry {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  phone: string;
  email: string;
  notes: string | null;
  ip: string | null;
  createdAt: string;
}

function toEntry(id: string, data: FirebaseFirestore.DocumentData): ContactSalesEntry {
  const ts = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt);
  return {
    id,
    name: data.name,
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    organizationName: data.organizationName,
    phone: data.phone,
    email: data.email,
    notes: data.notes ?? null,
    ip: data.ip ?? null,
    createdAt: ts.toISOString(),
  };
}

export async function createContactSalesEntry(data: {
  name: string;
  firstName?: string;
  lastName?: string;
  organizationName: string;
  phone: string;
  email: string;
  notes?: string;
  ip: string | null;
}): Promise<string> {
  const ref = await adminDb.collection('contactSales').add({
    name: data.name,
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    organizationName: data.organizationName,
    phone: data.phone,
    email: data.email.toLowerCase(),
    notes: data.notes ?? null,
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
