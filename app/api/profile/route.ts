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

    // NOTE: photoURL was stored on the legacy Firestore user doc; there is no
    // avatar column in public.users, so only displayName is persisted now.
    const { displayName } = await req.json();
    if (!displayName) return NextResponse.json({ ok: true });

    await updateAuthUser(user.uid, { displayName });
    await updateUser(user.uid, { displayName, updatedBy: user.uid });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[PATCH /api/profile]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
