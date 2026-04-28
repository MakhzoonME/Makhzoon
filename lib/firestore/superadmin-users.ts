import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export type MakhzoonRole = 'super_admin' | 'makhzoon_admin' | 'makhzoon_support';

export interface SuperAdminUser {
  id: string;
  email: string;
  displayName: string;
  role: MakhzoonRole;
  status: 'active' | 'deactivated';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

function toSuperAdminUser(id: string, data: FirebaseFirestore.DocumentData): SuperAdminUser {
  return {
    id,
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    status: data.status ?? 'active',
    createdBy: data.createdBy,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

export async function getSuperAdminUsers(): Promise<SuperAdminUser[]> {
  const snap = await adminDb
    .collection('superadminUsers')
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();
  return snap.docs.map((d) => toSuperAdminUser(d.id, d.data()));
}

export async function createSuperAdminUser(
  uid: string,
  data: { email: string; displayName: string; role: MakhzoonRole; createdBy: string }
): Promise<void> {
  await adminDb.collection('superadminUsers').doc(uid).set({
    ...data,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function updateSuperAdminUser(
  uid: string,
  data: { role?: MakhzoonRole; status?: 'active' | 'deactivated'; updatedBy: string }
): Promise<void> {
  await adminDb.collection('superadminUsers').doc(uid).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteSuperAdminUser(uid: string): Promise<void> {
  await adminDb.collection('superadminUsers').doc(uid).delete();
}
