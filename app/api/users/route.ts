import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getUsers, createUser } from '@/lib/firestore/users';
import { adminAuth } from '@/lib/firebase/admin';
import { writeAuditLog } from '@/lib/audit/logger';
import { inviteUserSchema } from '@/lib/validations/user.schema';

export async function GET(_req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orgId = user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const users = await getUsers(orgId);
    return NextResponse.json(users, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[GET /api/users]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orgId = user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const body = await req.json();
    const parsed = inviteUserSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;
    const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';

    const newUser = await adminAuth.createUser({
      email: data.email,
      displayName: data.displayName,
      password: tempPassword,
    });

    await adminAuth.setCustomUserClaims(newUser.uid, {
      role: data.role,
      organizationId: orgId,
    });

    await createUser(newUser.uid, {
      organizationId: orgId,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      status: 'active',
      createdBy: user.uid,
      updatedBy: user.uid,
    });

    await writeAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'USER_INVITED',
      module: 'users',
      recordId: newUser.uid,
      newValue: { email: data.email, role: data.role },
    });

    return NextResponse.json({ id: newUser.uid, tempPassword }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/users]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
