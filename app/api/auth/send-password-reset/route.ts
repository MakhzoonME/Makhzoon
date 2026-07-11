import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createPasswordResetToken } from '@/lib/db/password-reset-tokens';
import { sendEmail } from '@/lib/email/resend';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const limited = await checkRateLimit(`send-password-reset:ip:${clientIp}`, 5, 15 * 60 * 1000, { action: 'send password reset' });
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: true }); // avoid enumeration
  }

  const email = parsed.data.email.toLowerCase().trim();

  try {
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('id, display_name')
      .eq('email', email)
      .maybeSingle();

    if (userRow?.id) {
      const resetToken = await createPasswordResetToken(userRow.id);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
      const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
      const displayName = (userRow.display_name as string | null) ?? 'there';

      const sendResult = await sendEmail({
        to: email,
        subject: 'Reset your Makhzoon password',
        html: `<p>Hi ${displayName},</p><p>We received a request to reset the password for your Makhzoon account. Click the link below to set a new password.</p><p><a href="${resetLink}">Reset Password</a></p><p>This link expires in 24 hours. If you did not request this, you can safely ignore this email.</p>`,
        text: `Hi ${displayName},\n\nWe received a request to reset the password for your Makhzoon account. Visit the link below to set a new password:\n\n${resetLink}\n\nThis link expires in 24 hours. If you did not request this, you can safely ignore this email.`,
      });
      if (sendResult.skipped) {
        console.error('[POST /api/auth/send-password-reset] email skipped — missing RESEND_API_KEY or RESEND_FROM_EMAIL');
      } else {
        console.log('[POST /api/auth/send-password-reset] email sent', sendResult.id);
      }
    }
  } catch (err) {
    console.error('[POST /api/auth/send-password-reset]', err);
  }

  // Always return success to avoid email enumeration
  return NextResponse.json({ success: true });
}
