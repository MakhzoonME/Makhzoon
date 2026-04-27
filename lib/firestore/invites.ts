import { adminDb } from '@/lib/firebase/admin';
import { Invite, InviteStatus } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';

function toInvite(id: string, data: FirebaseFirestore.DocumentData): Invite {
  return {
    id,
    organizationId: data.organizationId,
    email: data.email,
    phone: data.phone,
    channel: data.channel ?? 'email',
    displayName: data.displayName,
    role: data.role,
    token: data.token,
    status: data.status,
    invitedBy: data.invitedBy,
    invitedByEmail: data.invitedByEmail,
    invitedByName: data.invitedByName,
    expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(data.expiresAt),
    acceptedAt: data.acceptedAt instanceof Timestamp ? data.acceptedAt.toDate() : undefined,
    acceptedBy: data.acceptedBy,
    revokedAt: data.revokedAt instanceof Timestamp ? data.revokedAt.toDate() : undefined,
    revokedBy: data.revokedBy,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
  };
}

export function generateInviteToken(): string {
  return randomBytes(24).toString('base64url');
}

export async function getInvites(orgId: string): Promise<Invite[]> {
  const snap = await adminDb
    .collection('invites')
    .where('organizationId', '==', orgId)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  return snap.docs.map((d) => toInvite(d.id, d.data()));
}

export async function getInviteByToken(token: string): Promise<Invite | null> {
  const snap = await adminDb.collection('invites').where('token', '==', token).limit(1).get();
  if (snap.empty) return null;
  return toInvite(snap.docs[0].id, snap.docs[0].data());
}

export async function getInviteById(id: string): Promise<Invite | null> {
  const doc = await adminDb.collection('invites').doc(id).get();
  if (!doc.exists) return null;
  return toInvite(doc.id, doc.data()!);
}

export async function getPendingInviteForEmail(orgId: string, email: string): Promise<Invite | null> {
  const snap = await adminDb
    .collection('invites')
    .where('organizationId', '==', orgId)
    .where('email', '==', email.toLowerCase())
    .where('status', '==', 'pending')
    .limit(1)
    .get();
  if (snap.empty) return null;
  return toInvite(snap.docs[0].id, snap.docs[0].data());
}

export async function getPendingInviteForPhone(orgId: string, phone: string): Promise<Invite | null> {
  const snap = await adminDb
    .collection('invites')
    .where('organizationId', '==', orgId)
    .where('phone', '==', phone)
    .where('status', '==', 'pending')
    .limit(1)
    .get();
  if (snap.empty) return null;
  return toInvite(snap.docs[0].id, snap.docs[0].data());
}

export async function getAnyPendingInviteByPhone(phone: string): Promise<Invite | null> {
  const snap = await adminDb
    .collection('invites')
    .where('phone', '==', phone)
    .where('status', '==', 'pending')
    .limit(1)
    .get();
  if (snap.empty) return null;
  return toInvite(snap.docs[0].id, snap.docs[0].data());
}

export async function createInvite(
  data: Omit<Invite, 'id' | 'createdAt' | 'status' | 'acceptedAt' | 'acceptedBy' | 'revokedAt' | 'revokedBy'>
): Promise<string> {
  const ref = await adminDb.collection('invites').add({
    ...data,
    email: data.email ? data.email.toLowerCase() : undefined,
    status: 'pending' as InviteStatus,
    expiresAt: data.expiresAt,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function markInviteAccepted(id: string, userId: string): Promise<void> {
  await adminDb.collection('invites').doc(id).update({
    status: 'accepted',
    acceptedAt: FieldValue.serverTimestamp(),
    acceptedBy: userId,
  });
}

export async function revokeInvite(id: string, userId: string): Promise<void> {
  await adminDb.collection('invites').doc(id).update({
    status: 'revoked',
    revokedAt: FieldValue.serverTimestamp(),
    revokedBy: userId,
  });
}
