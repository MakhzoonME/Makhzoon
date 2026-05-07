import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { checkOrigin } from '@/lib/csrf';
import { createEarlyAccessEntry } from '@/lib/db/early-access';

const notifyHtml = (email: string) => `
<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:40px 0;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:40px;">
      <div style="margin-bottom:24px;">
        <span style="display:inline-block;background:#4F46E5;color:#fff;font-size:13px;font-weight:600;padding:4px 12px;border-radius:999px;">New Early Access Request</span>
      </div>
      <p style="font-size:16px;color:#111827;margin:0 0 16px;">Someone requested early access to Makhzoon.</p>
      <div style="background:#f3f4f6;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <span style="font-size:13px;color:#6b7280;">Email</span><br/>
        <span style="font-size:15px;font-weight:600;color:#111827;">${email}</span>
      </div>
      <p style="font-size:13px;color:#9ca3af;margin:0;">Makhzoon · makhzoon.me</p>
    </div>
  </body>
</html>`;

const confirmHtml = (email: string) => `
<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:40px 0;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:40px;">
      <div style="text-align:center;margin-bottom:32px;">
        <svg width="48" height="48" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="14" fill="#4F46E5"/>
          <path d="M14 16 H22 L26 22 L32 16 L38 22 L42 16 H50 V22 H14 Z" fill="#fff" opacity="0.92"/>
          <rect x="14" y="27" width="36" height="6" fill="#fff" opacity="0.78" rx="1"/>
          <rect x="14" y="38" width="10" height="10" fill="#fff" rx="1"/>
          <rect x="28" y="38" width="8" height="10" fill="#fff" rx="1" opacity="0.85"/>
          <rect x="40" y="38" width="10" height="10" fill="#fff" rx="1"/>
        </svg>
        <div style="font-size:22px;font-weight:700;color:#111827;margin-top:16px;letter-spacing:-0.02em;">You&rsquo;re on the list.</div>
        <div style="font-size:14px;color:#6b7280;margin-top:6px;">We&rsquo;ll be in touch soon.</div>
      </div>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">
        Hi there,<br/><br/>
        Thanks for your interest in Makhzoon — the asset management platform built for operations teams who deserve better than spreadsheets.
      </p>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 32px;">
        We&rsquo;re working hard to get the product ready and will reach out to <strong>${email}</strong> as soon as we&rsquo;re ready to onboard you.
      </p>
      <div style="border-top:1px solid #e5e7eb;padding-top:24px;text-align:center;">
        <p style="font-size:13px;color:#9ca3af;margin:0;">Makhzoon &middot; Built in Amman &middot; <a href="https://makhzoon.me" style="color:#4F46E5;text-decoration:none;">makhzoon.me</a></p>
      </div>
    </div>
  </body>
</html>`;

export async function POST(req: NextRequest) {
  // SECURITY: Rate limit early access (5 per IP per day, 1 per email per week)
  const clientIp = getClientIp(req);
  const rateLimitIp = checkRateLimit(
    `early-access:ip:${clientIp}`,
    5,
    24 * 60 * 60 * 1000,
    { action: 'request early access' }
  );
  if (rateLimitIp) return rateLimitIp;

  // SECURITY: Validate origin to prevent CSRF
  const originCheck = checkOrigin(req);
  if (originCheck) return originCheck;

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 422 });
  }

  // Rate limit by email as well
  const rateLimitEmail = checkRateLimit(
    `early-access:email:${email}`,
    1,
    7 * 24 * 60 * 60 * 1000,
    { errorMessage: 'You have already requested early access from this email. Please check your inbox for updates.' }
  );
  if (rateLimitEmail) return rateLimitEmail;

  await Promise.all([
    sendEmail({
      to: 'info@makhzoon.me',
      subject: `Early access request from ${email}`,
      html: notifyHtml(email),
      text: `New early-access request\nEmail: ${email}`,
    }),
    sendEmail({
      to: email,
      subject: "You're on the Makhzoon early access list",
      html: confirmHtml(email),
      text: `Hi,\n\nThanks for your interest in Makhzoon. We'll reach out to ${email} as soon as we're ready to onboard you.\n\nMakhzoon · makhzoon.me`,
    }),
    createEarlyAccessEntry(email, clientIp),
  ]);

  return NextResponse.json({ ok: true });
}
