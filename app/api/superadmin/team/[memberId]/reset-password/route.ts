import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getSuperAdminUserById } from '@/lib/db/superadmin-users';
import { createPasswordResetToken } from '@/lib/db/password-reset-tokens';
import { sendEmail } from '@/lib/email/resend';

export async function POST(req: NextRequest, props: { params: Promise<{ memberId: string }> }) {
  const params = await props.params;
  const caller = await verifySessionCookie();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (caller.role !== 'super_admin' && caller.role !== 'makhzoon_admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = params;
  const target = await getSuperAdminUserById(memberId);
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  // makhzoon_admin cannot reset super_admin passwords
  if (caller.role === 'makhzoon_admin' && target.role === 'super_admin')
    return NextResponse.json({ error: 'You cannot reset a Super Admin password' }, { status: 403 });

  const resetToken = await createPasswordResetToken(memberId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  await sendEmail({
    to: target.email,
    subject: 'Reset your Makhzoon password',
    html: `<p>Hi ${target.displayName},</p><p>An administrator has requested a password reset for your account. Click the link below to set a new password.</p><p><a href="${resetLink}">Reset Password</a></p><p>This link expires in 24 hours.</p>`,
    text: `Hi ${target.displayName},\n\nAn administrator has requested a password reset for your account. Visit the link below:\n\n${resetLink}\n\nThis link expires in 24 hours.`,
  });

  return NextResponse.json({ type: 'email_sent' });
}
