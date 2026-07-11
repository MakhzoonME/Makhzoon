import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { updateAuthUser } from '@/lib/supabase/auth-admin';
import { updateUser } from '@/lib/db/users';
import { z } from 'zod';

const profilePatchSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  avatarUrl: z.string().max(2000).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  // SECURITY: Rate limit profile updates (20 per IP per hour)
  const clientIp = getClientIp(req);
  const rateLimitResult = await checkRateLimit(
    `profile:${clientIp}`,
    20,
    60 * 60 * 1000,
    { action: 'update profile' }
  );
  if (rateLimitResult) return rateLimitResult;

  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = profilePatchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 422 });
    const { displayName, avatarUrl } = parsed.data;
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
