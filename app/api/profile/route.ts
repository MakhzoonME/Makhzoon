import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { updateAuthUser } from '@/lib/supabase/auth-admin';
import { updateUser } from '@/lib/db/users';

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

    const { displayName, avatarUrl } = await req.json();
    if (!displayName && avatarUrl === undefined) {
      return NextResponse.json({ ok: true });
    }

    if (displayName) {
      await updateAuthUser(user.uid, { displayName });
    }

    await updateUser(user.uid, {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      updatedBy: user.uid,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[PATCH /api/profile]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
