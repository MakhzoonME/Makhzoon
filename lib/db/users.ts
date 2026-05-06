import { adminDb } from '@/lib/firebase/admin';
import { OrgUser, UserPermissions } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function toUser(id: string, data: FirebaseFirestore.DocumentData): OrgUser {
  return {
    id,
    organizationId: data.organizationId,
    email: data.email,
    username: data.username,
    displayName: data.displayName,
    role: data.role,
    status: data.status ?? 'active',
    permissions: (data.permissions ?? null) as UserPermissions | null,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    createdBy: data.createdBy,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    updatedBy: data.updatedBy,
  };
}

export async function getUsers(orgId: string): Promise<OrgUser[]> {
  const snap = await adminDb.collection('users')
    .where('organizationId', '==', orgId)
    .orderBy('createdAt', 'desc')
    .limit(500)
    .get();
  return snap.docs.map((d) => toUser(d.id, d.data()));
}

export async function getUserById(id: string): Promise<OrgUser | null> {
  const doc = await adminDb.collection('users').doc(id).get();
  if (!doc.exists) return null;
  return toUser(doc.id, doc.data()!);
}

export async function createUser(id: string, data: Omit<OrgUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  await adminDb.collection('users').doc(id).set({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function updateUser(id: string, data: Partial<OrgUser>): Promise<void> {
  await adminDb.collection('users').doc(id).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
