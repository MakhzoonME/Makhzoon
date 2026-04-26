import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function PATCH(req: NextRequest) {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { displayName, photoURL } = await req.json();

  const updates: Record<string, string> = {};
  if (displayName) updates.displayName = displayName;
  if (photoURL) updates.photoURL = photoURL;

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });

  await adminAuth.updateUser(user.uid, updates);

  const firestoreUpdates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid };
  if (displayName) firestoreUpdates.displayName = displayName;
  if (photoURL) firestoreUpdates.photoURL = photoURL;
  await adminDb.collection('users').doc(user.uid).update(firestoreUpdates);

  return NextResponse.json({ ok: true });
}
