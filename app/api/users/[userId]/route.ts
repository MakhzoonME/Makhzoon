import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { updateUser } from '@/lib/firestore/users';
import { writeAuditLog } from '@/lib/audit/logger';
import { FieldValue } from 'firebase-admin/firestore';

export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  const caller = await verifySessionCookie();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (caller.role !== 'admin' && caller.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId } = params;
  const body = await req.json();
  const { role } = body;
  if (!['admin', 'staff'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

  await updateUser(userId, { role, updatedBy: caller.uid });
  const existingClaims = (await adminAuth.getUser(userId)).customClaims ?? {};
  await adminAuth.setCustomUserClaims(userId, { ...existingClaims, role });

  await writeAuditLog({
    organizationId: caller.organizationId!,
    userId: caller.uid,
    role: caller.role,
    action: 'USER_UPDATED',
    module: 'users',
    recordId: userId,
    newValue: { role },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  const caller = await verifySessionCookie();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (caller.role !== 'admin' && caller.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId } = params;
  if (userId === caller.uid) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });

  const permanent = new URL(req.url).searchParams.get('permanent') === 'true';

  if (permanent) {
    try {
      await adminAuth.revokeRefreshTokens(userId);
    } catch { /* ignore if already deleted */ }
    try {
      await adminAuth.deleteUser(userId);
    } catch (err: unknown) {
      if ((err as { code?: string }).code !== 'auth/user-not-found') throw err;
    }
    await adminDb.collection('users').doc(userId).delete();

    await writeAuditLog({
      organizationId: caller.organizationId!,
      userId: caller.uid,
      role: caller.role,
      action: 'USER_DELETED',
      module: 'users',
      recordId: userId,
      newValue: { deleted: true },
    });
  } else {
    await adminAuth.updateUser(userId, { disabled: true });
    await adminAuth.revokeRefreshTokens(userId);
    await adminDb.collection('users').doc(userId).update({
      status: 'deactivated',
      updatedBy: caller.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await writeAuditLog({
      organizationId: caller.organizationId!,
      userId: caller.uid,
      role: caller.role,
      action: 'USER_DEACTIVATED',
      module: 'users',
      recordId: userId,
      newValue: { status: 'deactivated' },
    });
  }

  return NextResponse.json({ ok: true });
}
