import { adminDb } from '@/lib/firebase/admin';
import { Organization } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function toOrg(id: string, data: FirebaseFirestore.DocumentData): Organization {
  return {
    id,
    name: data.name,
    subdomain: data.subdomain,
    contactEmail: data.contactEmail,
    packageDetails: data.packageDetails,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    createdBy: data.createdBy,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    updatedBy: data.updatedBy,
  };
}

export async function getOrganizations(): Promise<Organization[]> {
  const snap = await adminDb.collection('organizations').orderBy('createdAt', 'desc').get();
  return snap.docs.map((d) => toOrg(d.id, d.data()));
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  const doc = await adminDb.collection('organizations').doc(id).get();
  if (!doc.exists) return null;
  return toOrg(doc.id, doc.data()!);
}

export async function createOrganization(data: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await adminDb.collection('organizations').add({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateOrganization(id: string, data: Partial<Organization>): Promise<void> {
  await adminDb.collection('organizations').doc(id).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function subdomainExists(subdomain: string): Promise<boolean> {
  const snap = await adminDb.collection('organizations').where('subdomain', '==', subdomain).limit(1).get();
  return !snap.empty;
}
