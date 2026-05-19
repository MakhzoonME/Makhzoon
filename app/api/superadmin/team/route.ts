import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { createAuthUser, authEmailExists } from '@/lib/supabase/auth-admin';
import {
  getSuperAdminUsers,
  createSuperAdminUser,
  MakhzoonRole,
} from '@/lib/db/superadmin-users';
import { createPasswordResetToken } from '@/lib/db/password-reset-tokens';
import { sendEmail } from '@/lib/email/resend';
import { z } from 'zod';

const createMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.enum(['super_admin', 'makhzoon_admin', 'makhzoon_support']),
  permissions: z.record(z.unknown()).optional().nullable(),
});

const ALLOWED_CALLER_ROLES = new Set(['super_admin', 'makhzoon_admin']);

export async function GET() {
  const caller = await verifySessionCookie();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ALLOWED_CALLER_ROLES.has(caller.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // public.superadmin_users is the single source of truth (greenfield —
  // there are no Firebase-only "synthetic" members to reconcile).
  const members = await getSuperAdminUsers();
  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const caller = await verifySessionCookie();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ALLOWED_CALLER_ROLES.has(caller.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = createMemberSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { email, displayName, role, permissions } = parsed.data;

  // Only super_admin can create super_admin accounts
  if (role === 'super_admin' && caller.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only Super Admins can create Super Admin accounts' }, { status: 403 });
  }

  // makhzoon_admin can only create makhzoon_support accounts
  if (caller.role === 'makhzoon_admin' && role !== 'makhzoon_support') {
    return NextResponse.json({ error: 'Makhzoon Admins can only create Support accounts' }, { status: 403 });
  }

  if (await authEmailExists(email)) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
  }

  // Create with a random throwaway password — the member sets their real one
  // via the password-reset link emailed below.
  const newUser = await createAuthUser({
    email,
    displayName,
    password: randomBytes(24).toString('base64url'),
    role: role as MakhzoonRole,
    organizationId: null,
  });

  await createSuperAdminUser(newUser.uid, {
    email,
    displayName,
    role: role as MakhzoonRole,
    createdBy: caller.uid,
    permissions: role === 'makhzoon_support' && permissions ? permissions as never : undefined,
  });

  // Generate password reset token and send email with reset link
  const resetToken = await createPasswordResetToken(newUser.uid);
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

  await sendEmail({
    to: email,
    subject: 'Set up your Makhzoon team account',
    html: `<p>Hi ${displayName},</p><p>Your Makhzoon team account has been created. Click the link below to set your password.</p><p><a href="${resetLink}">Set Password</a></p><p>This link expires in 24 hours.</p>`,
    text: `Hi ${displayName},\n\nYour Makhzoon team account has been created. Visit the link below to set your password:\n\n${resetLink}\n\nThis link expires in 24 hours.`,
  }).catch((err) => {
    if (process.env.NODE_ENV !== 'production') console.warn('[team] Welcome email failed:', err);
  });

  return NextResponse.json({ id: newUser.uid }, { status: 201 });
}
