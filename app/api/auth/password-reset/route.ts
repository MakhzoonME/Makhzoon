import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { verifyPasswordResetToken } from '@/lib/db/password-reset-tokens';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

const resetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Rate limit password reset attempts to prevent brute-force token
    // guessing and replay of leaked tokens. 5 attempts per IP per 15 minutes
    // (matches the login endpoint's posture for credential-handling actions).
    const clientIp = getClientIp(req);
    const rateLimitIp = checkRateLimit(
      `password-reset:ip:${clientIp}`,
      5,
      15 * 60 * 1000,
      { action: 'reset password' }
    );
    if (rateLimitIp) return rateLimitIp;

    const body = await req.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { token, password } = parsed.data;

    // SECURITY: Per-token rate limit — even with a valid leaked token, an
    // attacker can only attempt a small number of resets before being blocked.
    const rateLimitToken = checkRateLimit(
      `password-reset:token:${token}`,
      3,
      60 * 60 * 1000,
      { action: 'reset password with this token' }
    );
    if (rateLimitToken) return rateLimitToken;

    // Verify token and get UID
    const uid = await verifyPasswordResetToken(token);
    if (!uid) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    // Update password
    await adminAuth.updateUser(uid, { password });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/auth/password-reset]', err);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
