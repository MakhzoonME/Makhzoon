import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getInvites, getPendingInviteForEmail, createInvite, generateInviteToken } from '@/lib/firestore/invites';
import { getOrganizationById } from '@/lib/firestore/organizations';
import { createInviteSchema } from '@/lib/validations/invite.schema';
import { adminAuth } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/email/resend';
import { inviteEmail } from '@/lib/email/templates';
import { writeAuditLog } from '@/lib/audit/logger';

export async function GET() {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const invites = await getInvites(user.organizationId);
  return NextResponse.json(invites);
}

export async function POST(req: NextRequest) {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const body = await req.json();
  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { email, displayName, role } = parsed.data;

  try {
    const existing = await adminAuth.getUserByEmail(email).catch(() => null);
    if (existing) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
  } catch {
    // ignore
  }

  const pending = await getPendingInviteForEmail(user.organizationId, email);
  if (pending) return NextResponse.json({ error: 'An invite is already pending for this email' }, { status: 409 });

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const id = await createInvite({
    organizationId: user.organizationId,
    email,
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
  const { html, text } = inviteEmail({
    orgName: org?.name ?? 'your organization',
    inviterName: user.displayName || user.email,
    acceptUrl,
    role,
  });
  const sendResult = await sendEmail({ to: email, subject: `You're invited to ${org?.name ?? 'a workspace'}`, html, text });

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: user.uid,
    role: user.role,
    action: 'INVITE_SENT',
    module: 'users',
    recordId: id,
    newValue: { email, role, emailSent: !sendResult.skipped },
  });

  return NextResponse.json({ id, acceptUrl, emailSent: !sendResult.skipped }, { status: 201 });
}
