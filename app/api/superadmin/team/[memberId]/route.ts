import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import {
  updateAuthUser,
  setAuthUserActive,
  revokeAuthUserSessions,
  deleteAuthUser,
} from '@/lib/supabase/auth-admin';
import {
  updateSuperAdminUser,
  deleteSuperAdminUser,
  getSuperAdminUsers,
  MakhzoonRole,
} from '@/lib/db/superadmin-users';
import { hasSuperAdminPermission } from '@/lib/permissions/superadmin';
import { z } from 'zod';

const patchSchema = z.object({
  role: z.enum(['super_admin', 'makhzoon_admin', 'makhzoon_support']).optional(),
  status: z.enum(['active', 'deactivated']).optional(),
  permissions: z.record(z.unknown()).optional().nullable(),
  displayName: z.string().min(2).max(100).optional(),
});

export async function PATCH(req: NextRequest, props: { params: Promise<{ memberId: string }> }) {
  const params = await props.params;
  const caller = await verifySessionCookie();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasSuperAdminPermission(caller, 'team', 'manage'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (params.memberId === caller.uid)
    return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  // Resolve target member's current role
  const allMembers = await getSuperAdminUsers();
  const target = allMembers.find((m) => m.id === params.memberId);
  const targetRole = target?.role;

  // makhzoon_admin cannot touch super_admin members
  if (caller.role === 'makhzoon_admin' && targetRole === 'super_admin') {
    return NextResponse.json({ error: 'Makhzoon Admins cannot modify Super Admin accounts' }, { status: 403 });
  }

  // Only super_admin can assign super_admin role
  if (parsed.data.role === 'super_admin' && caller.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only Super Admins can grant the Super Admin role' }, { status: 403 });
  }

  // makhzoon_admin cannot promote to makhzoon_admin
  if (caller.role === 'makhzoon_admin' && parsed.data.role === 'makhzoon_admin') {
    return NextResponse.json({ error: 'Makhzoon Admins cannot grant the Makhzoon Admin role' }, { status: 403 });
  }

  await updateSuperAdminUser(params.memberId, {
    role: parsed.data.role as MakhzoonRole | undefined,
    status: parsed.data.status,
    permissions: parsed.data.permissions as never,
    updatedBy: caller.uid,
  });

  if (parsed.data.displayName || parsed.data.role) {
    await updateAuthUser(params.memberId, {
      displayName: parsed.data.displayName,
      role: parsed.data.role as MakhzoonRole | undefined,
    });
  }
  if (parsed.data.status === 'deactivated') {
    await setAuthUserActive(params.memberId, false);
  } else if (parsed.data.status === 'active') {
    await setAuthUserActive(params.memberId, true);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ memberId: string }> }) {
  const params = await props.params;
  const caller = await verifySessionCookie();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Only super_admin can permanently delete — this is intentional role-level protection,
  // not permission-level, because delete is destructive and irreversible.
  if (caller.role !== 'super_admin')
    return NextResponse.json({ error: 'Only Super Admins can permanently delete team members' }, { status: 403 });
  if (params.memberId === caller.uid)
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });

  await revokeAuthUserSessions(params.memberId);
  await deleteAuthUser(params.memberId);
  await deleteSuperAdminUser(params.memberId);

  return NextResponse.json({ ok: true });
}
