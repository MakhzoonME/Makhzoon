import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { getUsers, createUser } from '@/lib/db/users';
import { createAuthUser } from '@/lib/supabase/auth-admin';
import { auditLog } from '@/lib/platform/audit';
import { inviteUserSchema } from '@/lib/validations/user.schema';
import { hasPermission } from '@/lib/platform/permissions';
import { checkResourceLimit } from '@/lib/platform/limits/check-limit';

export async function GET(_req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    const user = tenant.user;
    const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.role === 'org_owner';
    const canViewUsers = isAdmin || hasPermission(tenant, 'settings', 'users');
    if (!canViewUsers) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const users = await getUsers(tenant.organizationId);
    return NextResponse.json(users, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/users]', err);
    const debug = process.env.NODE_ENV !== 'production' || process.env.DEBUG_API_ERRORS === '1';
    return NextResponse.json(
      debug
        ? {
            error: 'Internal server error',
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack?.split('\n').slice(0, 8) : undefined,
            code: (err as { code?: string | number })?.code,
          }
        : { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    const user = tenant.user;
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (tenant.subscription?.status && tenant.subscription.status !== 'ACTIVE')
      return NextResponse.json({ error: 'Subscription expired' }, { status: 403 });
    await checkResourceLimit(tenant, 'users');

    const body = await req.json();
    const parsed = inviteUserSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;
    if (!data.email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 422 });
    }

    const tempPassword = randomBytes(16).toString('base64');

    const newUser = await createAuthUser({
      email: data.email,
      displayName: data.displayName,
      password: tempPassword,
      role: data.role,
      organizationId: tenant.organizationId,
    });

    await createUser(newUser.uid, {
      organizationId: tenant.organizationId,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      status: 'active',
      createdBy: user.uid,
      updatedBy: user.uid,
    });

    auditLog.queue({
      tenant,
      action: 'USER_INVITED',
      module: 'users',
      recordId: newUser.uid,
      newValue: { email: data.email, role: data.role },
    });

    return NextResponse.json({
      id: newUser.uid,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      message: 'User created. They will receive an email to set their password.'
    }, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/users]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
