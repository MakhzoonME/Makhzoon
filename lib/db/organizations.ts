import { adminDb } from '@/lib/firebase/admin';
import { Organization } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function toOrg(id: string, data: FirebaseFirestore.DocumentData): Organization {
  return {
    id,
    name: data.name,
    subdomain: data.subdomain,
    contactEmail: data.contactEmail,
    description: data.description ?? null,
    category: data.category ?? null,
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

export async function getOrganizationBySubdomain(subdomain: string): Promise<Organization | null> {
  const snap = await adminDb.collection('organizations').where('subdomain', '==', subdomain).limit(1).get();
  if (snap.empty) return null;
  return toOrg(snap.docs[0].id, snap.docs[0].data());
}

export async function getOrganizationsWithSearch(filters?: {
  search?: string;
  category?: string;
}): Promise<Organization[]> {
  // Firestore can't do case-insensitive contains-search natively.
  // Strategy: server-side filter `category` (small set, exact match), then in-memory
  // substring filter on `search`. Total org count is bounded enough for this to be fine.
  let q: FirebaseFirestore.Query = adminDb.collection('organizations').orderBy('createdAt', 'desc');
  if (filters?.category) q = q.where('category', '==', filters.category);
  const snap = await q.get();
  let rows = snap.docs.map((d) => toOrg(d.id, d.data()));
  const term = filters?.search?.trim().toLowerCase();
  if (term) {
    rows = rows.filter((o) =>
      o.name.toLowerCase().includes(term) ||
      o.subdomain.toLowerCase().includes(term) ||
      o.contactEmail.toLowerCase().includes(term),
    );
  }
  return rows;
}
