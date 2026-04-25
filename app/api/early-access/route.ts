import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 422 });
  }

  await sendEmail({
    to: 'info@makhzoon.com',
    subject: 'New early-access request',
    html: `<p>A new visitor requested early access.</p><p><strong>Email:</strong> ${email}</p>`,
    text: `New early-access request\nEmail: ${email}`,
  });

  return NextResponse.json({ ok: true });
}
