import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getUsers, createUser } from '@/lib/db/users';
import { adminAuth } from '@/lib/firebase/admin';
import { queueAuditLog } from '@/lib/audit/logger';
import { inviteUserSchema } from '@/lib/validations/user.schema';
import { withLogging } from '@/lib/logging/with-logging';
import { requireActiveSubscription } from '@/lib/services/base.service';

async function _GET(_req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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

async function _POST(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orgId = user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    await requireActiveSubscription(orgId, user);

    const body = await req.json();
    const parsed = inviteUserSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;

    // Generate a temporary password (used only internally for creation, not returned to API)
    // User will receive password reset email instead
    const tempPassword = randomBytes(16).toString('base64');

    const newUser = await adminAuth.createUser({
      email: data.email,
      displayName: data.displayName,
      password: tempPassword,
      emailVerified: false, // User must verify email before full access
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

    queueAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'USER_INVITED',
      module: 'users',
      recordId: newUser.uid,
      newValue: { email: data.email, role: data.role },
    });

    // SECURITY: Do NOT return tempPassword in response
    // Client should send password reset email instead via separate endpoint
    // This prevents credentials from being exposed in logs/CDN/proxies
    return NextResponse.json({
      id: newUser.uid,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      message: 'User created. They will receive an email to set their password.'
    }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/users]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET  = withLogging(_GET);
export const POST = withLogging(_POST);
