import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { withLogging } from '@/lib/logging/with-logging';
import {
  getInvites,
  getPendingInviteForEmail,
  getPendingInviteForUsername,
  createInvite,
  generateInviteToken,
} from '@/lib/db/invites';
import { getOrganizationById } from '@/lib/db/organizations';
import { createInviteSchema } from '@/lib/validations/invite.schema';
import { adminAuth } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/email/resend';
import { inviteEmail } from '@/lib/email/templates';
import { writeAuditLog } from '@/lib/audit/logger';
import { generateInviteQRDataUrl } from '@/lib/qr';

async function _GET(_req: NextRequest) {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const invites = await getInvites(user.organizationId);
  return NextResponse.json(invites);
}

async function _POST(req: NextRequest) {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const body = await req.json();
  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { email, username, displayName, role, permissions } = parsed.data as typeof parsed.data & { permissions?: unknown };
  const normalizedEmail = email || undefined;
  const normalizedUsername = username ? username.toLowerCase() : undefined;

  if (normalizedEmail) {
    const existing = await adminAuth.getUserByEmail(normalizedEmail).catch(() => null);
    if (existing) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    const pending = await getPendingInviteForEmail(user.organizationId, normalizedEmail);
    if (pending) return NextResponse.json({ error: 'An invite is already pending for this email' }, { status: 409 });
  }
  if (normalizedUsername) {
    const syntheticEmail = `${normalizedUsername}@makhzoon.local`;
    const existing = await adminAuth.getUserByEmail(syntheticEmail).catch(() => null);
    if (existing) return NextResponse.json({ error: 'This username is already taken' }, { status: 409 });
    const pending = await getPendingInviteForUsername(user.organizationId, normalizedUsername);
    if (pending) return NextResponse.json({ error: 'An invite is already pending for this username' }, { status: 409 });
  }

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const id = await createInvite({
    organizationId: user.organizationId,
    email: normalizedEmail,
    username: normalizedUsername,
    displayName,
    role,
    token,
    invitedBy: user.uid,
    invitedByEmail: user.email,
    invitedByName: user.displayName,
    expiresAt,
    permissions: (permissions ?? null) as import('@/types').UserPermissions | null,
  });

  const org = await getOrganizationById(user.organizationId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? req.nextUrl.origin;
  const acceptUrl = `${baseUrl}/invites/${token}`;
  let messageSent = false;

  if (normalizedEmail) {
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
  }

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: user.uid,
    role: user.role,
    action: 'INVITE_SENT',
    module: 'users',
    recordId: id,
    newValue: { email: normalizedEmail, username: normalizedUsername, role, messageSent },
  });

  const qrDataUrl = await generateInviteQRDataUrl(acceptUrl);

  return NextResponse.json(
    { id, acceptUrl, qrDataUrl, expiresAt, messageSent, username: normalizedUsername },
    { status: 201 },
  );
}

export const GET  = withLogging(_GET);
export const POST = withLogging(_POST);
