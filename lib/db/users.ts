import { adminDb, adminAuth } from '@/lib/firebase/admin';
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

/** Firebase Auth is the source of truth for email. Firestore docs may hold a
 *  scrubbed placeholder (see scripts/clone-firestore.ts). Look up real emails
 *  for the given uids and overlay them onto the rows. */
async function enrichEmailsFromAuth(users: OrgUser[]): Promise<OrgUser[]> {
  if (users.length === 0) return users;
  const uids = users.map((u) => ({ uid: u.id }));
  // getUsers takes max 100 identifiers per call.
  const emailByUid = new Map<string, string>();
  for (let i = 0; i < uids.length; i += 100) {
    const batch = uids.slice(i, i + 100);
    try {
      const res = await adminAuth.getUsers(batch);
      for (const u of res.users) {
        if (u.email) emailByUid.set(u.uid, u.email);
      }
    } catch {
      // best-effort — fall back to Firestore email if Auth lookup fails
    }
  }
  return users.map((u) => {
    const authEmail = emailByUid.get(u.id);
    return authEmail ? { ...u, email: authEmail } : u;
  });
}

export async function getUsers(orgId: string): Promise<OrgUser[]> {
  const snap = await adminDb.collection('users')
    .where('organizationId', '==', orgId)
    .orderBy('createdAt', 'desc')
    .limit(500)
    .get();
  const users = snap.docs.map((d) => toUser(d.id, d.data()));
  return enrichEmailsFromAuth(users);
}

export async function getUserById(id: string): Promise<OrgUser | null> {
  const doc = await adminDb.collection('users').doc(id).get();
  if (!doc.exists) return null;
  const user = toUser(doc.id, doc.data()!);
  try {
    const authUser = await adminAuth.getUser(id);
    if (authUser.email) return { ...user, email: authUser.email };
  } catch {
    // fall back to firestore email
  }
  return user;
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
