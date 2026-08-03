import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { hasPermission } from '@/lib/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getUserById } from '@/lib/db/users';
import { createPasswordResetToken } from '@/lib/db/password-reset-tokens';
import { sendEmail } from '@/lib/email/resend';

const resetPasswordSchema = z.object({
  mode: z.enum(['email', 'link', 'temp_password']).optional(),
});

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let p = '';
  for (let i = 0; i < 14; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

export async function POST(req: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const tenant = await resolveTenant().catch(() => null);
  const caller = tenant?.user;
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(caller, 'settingsUsers', 'resetPassword'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const allowedRoles = new Set(['super_admin', 'org_owner', 'admin']);
  if (!allowedRoles.has(caller.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId } = params;
  const orgId = tenant?.organizationId ?? caller.organizationId;

  const targetUser = await getUserById(userId);
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (caller.role === 'admin' && targetUser.role === 'org_owner')
    return NextResponse.json({ error: 'Admins cannot reset Owner passwords' }, { status: 403 });
  if (orgId && targetUser.organizationId !== orgId && caller.role !== 'super_admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Username accounts have no real email — 'email' mode is not available to them.
  const isUsernameAccount = !!targetUser.username && !!targetUser.email?.endsWith('@makhzoon.local');

  const parsed = resetPasswordSchema.safeParse(await req.json().catch(() => ({})));
  const requestedMode = parsed.success ? parsed.data.mode : undefined;
  const mode = requestedMode ?? (isUsernameAccount ? 'temp_password' : 'email');

  if (mode === 'email') {
    if (isUsernameAccount) return NextResponse.json({ error: 'This user has no email on file' }, { status: 400 });

    const resetToken = await createPasswordResetToken(userId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    await sendEmail({
      to: targetUser.email!,
      subject: 'Reset your Makhzoon password',
      html: `<p>Hi ${targetUser.displayName},</p><p>An administrator has requested a password reset for your account. Click the link below to set a new password.</p><p><a href="${resetLink}">Reset Password</a></p><p>This link expires in 24 hours. If you did not expect this, contact your organization administrator.</p>`,
      text: `Hi ${targetUser.displayName},\n\nAn administrator has requested a password reset for your account. Visit the link below to set a new password:\n\n${resetLink}\n\nThis link expires in 24 hours.`,
    });

    return NextResponse.json({ type: 'email_sent' });
  }

  if (mode === 'link') {
    const resetToken = await createPasswordResetToken(userId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    return NextResponse.json({ type: 'reset_link', link: resetLink });
  }

  // temp_password — userId is the auth.users UUID so we can update directly.
  const tempPassword = generateTempPassword();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: tempPassword });
  if (error) return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  return NextResponse.json({ type: 'temp_password', password: tempPassword });
}
