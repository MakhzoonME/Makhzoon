import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { verifyPasswordResetToken } from '@/lib/db/password-reset-tokens';
import { z } from 'zod';

const resetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { token, password } = parsed.data;

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
