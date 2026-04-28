import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { adminAuth } from '@/lib/firebase/admin';
import {
  updateSuperAdminUser,
  deleteSuperAdminUser,
  MakhzoonRole,
} from '@/lib/firestore/superadmin-users';
import { z } from 'zod';

const patchSchema = z.object({
  role: z.enum(['makhzoon_admin', 'makhzoon_support']).optional(),
  status: z.enum(['active', 'deactivated']).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { memberId: string } }) {
  const caller = await verifySessionCookie();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (caller.role !== 'super_admin' && caller.role !== 'makhzoon_admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (params.memberId === caller.uid)
    return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  // makhzoon_admin cannot promote to makhzoon_admin
  if (caller.role === 'makhzoon_admin' && parsed.data.role === 'makhzoon_admin') {
    return NextResponse.json({ error: 'Makhzoon Admins cannot grant the Makhzoon Admin role' }, { status: 403 });
  }

  const update: Record<string, unknown> = { updatedBy: caller.uid };
  if (parsed.data.role) update.role = parsed.data.role;
  if (parsed.data.status) update.status = parsed.data.status;

  await updateSuperAdminUser(params.memberId, update as Parameters<typeof updateSuperAdminUser>[1]);

  if (parsed.data.role) {
    const existingClaims = (await adminAuth.getUser(params.memberId)).customClaims ?? {};
    await adminAuth.setCustomUserClaims(params.memberId, { ...existingClaims, role: parsed.data.role as MakhzoonRole });
  }
  if (parsed.data.status === 'deactivated') {
    await adminAuth.updateUser(params.memberId, { disabled: true });
    await adminAuth.revokeRefreshTokens(params.memberId);
  } else if (parsed.data.status === 'active') {
    await adminAuth.updateUser(params.memberId, { disabled: false });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { memberId: string } }) {
  const caller = await verifySessionCookie();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (caller.role !== 'super_admin') return NextResponse.json({ error: 'Only Super Admins can permanently delete team members' }, { status: 403 });
  if (params.memberId === caller.uid)
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });

  try { await adminAuth.revokeRefreshTokens(params.memberId); } catch { /* ignore */ }
  try { await adminAuth.deleteUser(params.memberId); } catch { /* ignore */ }
  await deleteSuperAdminUser(params.memberId);

  return NextResponse.json({ ok: true });
}
