import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function PATCH(req: NextRequest) {
  // SECURITY: Rate limit profile updates (20 per IP per hour)
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit(
    `profile:${clientIp}`,
    20,
    60 * 60 * 1000,
    { action: 'update profile' }
  );
  if (rateLimitResult) return rateLimitResult;

  try {
    const tenant = await resolveTenant();
    const user = tenant.user;

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
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[PATCH /api/profile]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
