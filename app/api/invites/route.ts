import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import {
  getInvites,
  getPendingInviteForEmail,
  getPendingInviteForPhone,
  createInvite,
  generateInviteToken,
} from '@/lib/firestore/invites';
import { getOrganizationById } from '@/lib/firestore/organizations';
import { createInviteSchema } from '@/lib/validations/invite.schema';
import { adminAuth } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/email/resend';
import { inviteEmail } from '@/lib/email/templates';
import { sendInviteMessage } from '@/lib/sms/provider';
import { writeAuditLog } from '@/lib/audit/logger';
import { generateInviteQRDataUrl } from '@/lib/qr';

export async function GET() {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const invites = await getInvites(user.organizationId);
  return NextResponse.json(invites);
}

export async function POST(req: NextRequest) {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const body = await req.json();
  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { email, phone, channel, displayName, role } = parsed.data;
  const normalizedEmail = email || undefined;
  const normalizedPhone = phone || undefined;

  const deliveryChannel = normalizedEmail && !normalizedPhone ? 'email' : (channel ?? 'sms');

  if (normalizedEmail) {
    const existing = await adminAuth.getUserByEmail(normalizedEmail).catch(() => null);
    if (existing) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    const pending = await getPendingInviteForEmail(user.organizationId, normalizedEmail);
    if (pending) return NextResponse.json({ error: 'An invite is already pending for this email' }, { status: 409 });
  }
  if (normalizedPhone) {
    const existing = await adminAuth.getUserByPhoneNumber(normalizedPhone).catch(() => null);
    if (existing)
      return NextResponse.json({ error: 'A user with this phone number already exists' }, { status: 409 });
    const pending = await getPendingInviteForPhone(user.organizationId, normalizedPhone);
    if (pending)
      return NextResponse.json({ error: 'An invite is already pending for this phone number' }, { status: 409 });
  }

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const id = await createInvite({
    organizationId: user.organizationId,
    email: normalizedEmail,
    phone: normalizedPhone,
    channel: deliveryChannel as 'email' | 'sms' | 'whatsapp',
    displayName,
    role,
    token,
    invitedBy: user.uid,
    invitedByEmail: user.email,
    invitedByName: user.displayName,
    expiresAt,
  });

  const org = await getOrganizationById(user.organizationId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? req.nextUrl.origin;
  const acceptUrl = `${baseUrl}/invites/${token}`;
  let messageSent = false;

  if (deliveryChannel === 'email' && normalizedEmail) {
    const { html, text } = inviteEmail({
      orgName: org?.name ?? 'your organization',
      inviterName: user.displayName || user.email,
      acceptUrl,
      role,
    });
    try {
      const sendResult = await sendEmail({
        to: normalizedEmail,
        subject: `You're invited to ${org?.name ?? 'a workspace'}`,
        html,
        text,
      });
      messageSent = !sendResult.skipped;
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('[invite] Email send failed:', err);
    }
  } else if ((deliveryChannel === 'sms' || deliveryChannel === 'whatsapp') && normalizedPhone) {
    try {
      messageSent = await sendInviteMessage(
        deliveryChannel,
        normalizedPhone,
        org?.name ?? 'your organization',
        user.displayName || user.email,
        acceptUrl
      );
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('[invite] SMS/WhatsApp send failed:', err);
    }
  }

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: user.uid,
    role: user.role,
    action: 'INVITE_SENT',
    module: 'users',
    recordId: id,
    newValue: { email: normalizedEmail, phone: normalizedPhone, channel: deliveryChannel, role, messageSent },
  });

  const qrDataUrl = await generateInviteQRDataUrl(acceptUrl);

  return NextResponse.json(
    { id, acceptUrl, qrDataUrl, expiresAt, messageSent, channel: deliveryChannel },
    { status: 201 },
  );
}
