import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { getUserById, updateUser } from '@/lib/db/users';
import { auditLog } from '@/lib/platform/audit';
import { invalidateCachedPermissions, invalidateCachedSessionsForUser } from '@/lib/firebase/session-cache';
import { FieldValue } from 'firebase-admin/firestore';

export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  const tenant = await resolveTenant().catch(() => null);
  const caller = tenant?.user;
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (caller.role !== 'admin' && caller.role !== 'super_admin' && caller.role !== 'org_owner')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (tenant?.subscription?.status && tenant.subscription.status !== 'ACTIVE')
    return NextResponse.json({ error: 'Subscription expired' }, { status: 403 });

  const isSuperAdmin = caller.role === 'super_admin';
  const orgId = tenant?.organizationId ?? caller.organizationId;

  const { userId } = params;
  if (userId === caller.uid) return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });

  const targetUser = await getUserById(userId);
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!isSuperAdmin && orgId && targetUser.organizationId !== orgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (targetUser.role === 'org_owner' && caller.role === 'admin') {
    return NextResponse.json({ error: 'Admins cannot modify Owner accounts' }, { status: 403 });
  }

  const body = await req.json();
  const { role, permissions } = body;
  if (!['org_owner', 'admin', 'staff'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

  if (role === 'org_owner' && caller.role !== 'super_admin' && caller.role !== 'org_owner') {
    return NextResponse.json({ error: 'Only an Owner or Super Admin can grant the Owner role' }, { status: 403 });
  }

  await updateUser(userId, { role, permissions: permissions ?? undefined, updatedBy: caller.uid });
  const existingClaims = (await adminAuth.getUser(userId)).customClaims ?? {};
  await adminAuth.setCustomUserClaims(userId, { ...existingClaims, role });
  await adminAuth.revokeRefreshTokens(userId);
  invalidateCachedPermissions(userId);
  invalidateCachedSessionsForUser(userId);

  if (tenant) {
    auditLog.queue({
      tenant,
      action: 'USER_UPDATED',
      module: 'users',
      recordId: userId,
      newValue: { role },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  const tenant = await resolveTenant().catch(() => null);
  const caller = tenant?.user;
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (caller.role !== 'admin' && caller.role !== 'super_admin' && caller.role !== 'org_owner')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (tenant?.subscription?.status && tenant.subscription.status !== 'ACTIVE')
    return NextResponse.json({ error: 'Subscription expired' }, { status: 403 });

  const isSuperAdminDel = caller.role === 'super_admin';
  const orgId = tenant?.organizationId ?? caller.organizationId;

  const { userId } = params;
  if (userId === caller.uid) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });

  const targetUser = await getUserById(userId);
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!isSuperAdminDel && orgId && targetUser.organizationId !== orgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (targetUser.role === 'org_owner' && caller.role === 'admin') {
    return NextResponse.json({ error: 'Admins cannot remove Owner accounts' }, { status: 403 });
  }

  const permanent = new URL(req.url).searchParams.get('permanent') === 'true';

  invalidateCachedPermissions(userId);

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

    if (tenant) {
      auditLog.queue({
        tenant,
        action: 'USER_DELETED',
        module: 'users',
        recordId: userId,
        newValue: { deleted: true },
      });
    }
  } else {
    await adminAuth.updateUser(userId, { disabled: true });
    await adminAuth.revokeRefreshTokens(userId);
    await adminDb.collection('users').doc(userId).update({
      status: 'deactivated',
      updatedBy: caller.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (tenant) {
      auditLog.queue({
        tenant,
        action: 'USER_DEACTIVATED',
        module: 'users',
        recordId: userId,
        newValue: { status: 'deactivated' },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
