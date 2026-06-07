import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { hasPermission } from '@/lib/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { updateAuthUser, setAuthUserActive, revokeAuthUserSessions, deleteAuthUser } from '@/lib/supabase/auth-admin';
import { getUserById, updateUser } from '@/lib/db/users';
import { auditLog } from '@/lib/platform/audit';
import { invalidateCachedPermissions, invalidateCachedSessionsForUser } from '@/lib/supabase/session-cache';

export async function PATCH(req: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const tenant = await resolveTenant().catch(() => null);
  const caller = tenant?.user;
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(caller, 'settings', 'users'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (tenant?.subscription?.status && tenant.subscription.status !== 'ACTIVE')
    return NextResponse.json({ error: 'Subscription expired' }, { status: 403 });

  const isSuperAdmin = caller.role === 'super_admin';
  const isOwnerOrSuperAdmin = caller.role === 'org_owner' || isSuperAdmin;
  const orgId = tenant?.organizationId ?? caller.organizationId;

  const { userId } = params;
  // Owners and super admins can edit themselves; others cannot.
  if (userId === caller.uid && !isOwnerOrSuperAdmin) {
    return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
  }

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
  await updateAuthUser(userId, { role });
  // Only revoke sessions when editing someone else — revoking your own session
  // forces an immediate logout, making it impossible to see the updated state.
  // The caller's client refreshes its auth store separately.
  if (userId !== caller.uid) {
    await revokeAuthUserSessions(userId);
  }
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

export async function DELETE(req: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const tenant = await resolveTenant().catch(() => null);
  const caller = tenant?.user;
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(caller, 'settings', 'users'))
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
    await revokeAuthUserSessions(userId);
    await deleteAuthUser(userId);
    await supabaseAdmin.from('users').delete().eq('id', userId);

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
    await setAuthUserActive(userId, false);
    await updateUser(userId, { status: 'deactivated', updatedBy: caller.uid });

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
