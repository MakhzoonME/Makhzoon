import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { checkResourceLimit } from '@/lib/platform/limits/check-limit';
import {
  getInvites,
  getPendingInviteForEmail,
  getPendingInviteForUsername,
  createInvite,
  generateInviteToken,
} from '@/lib/db/invites';
import { getOrganizationById } from '@/lib/db/organizations';
import { createInviteSchema } from '@/lib/validations/invite.schema';
import { authEmailExists } from '@/lib/supabase/auth-admin';
import { sendEmail } from '@/lib/email/resend';
import { inviteEmail } from '@/lib/email/templates';
import { auditLog } from '@/lib/platform/audit';
import { generateInviteQRDataUrl } from '@/lib/qr';

export async function GET(_req: NextRequest) {
  const tenant = await resolveTenant();
  const user = tenant.user;
  if (!hasPermission(user, 'settings', 'users'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const invites = await getInvites(tenant.organizationId);
  return NextResponse.json(invites);
}

export async function POST(req: NextRequest) {
  // SECURITY: Rate limit invite sending (10 per IP per hour)
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit(
    `invite:${clientIp}`,
    10,
    60 * 60 * 1000,
    { action: 'send invites' }
  );
  if (rateLimitResult) return rateLimitResult;

  const tenant = await resolveTenant();
  const user = tenant.user;
  if (!hasPermission(user, 'settings', 'users'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (tenant.subscription?.status && tenant.subscription.status !== 'ACTIVE')
    return NextResponse.json({ error: 'Subscription expired' }, { status: 403 });
  await checkResourceLimit(tenant, 'users');

  const body = await req.json();
  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { email, username, displayName, role, permissions } = parsed.data;
  const normalizedEmail = email || undefined;
  const normalizedUsername = username ? username.toLowerCase() : undefined;

  if (normalizedEmail) {
    if (await authEmailExists(normalizedEmail)) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }
    const pending = await getPendingInviteForEmail(tenant.organizationId, normalizedEmail);
    if (pending) {
      return NextResponse.json({ error: 'This email already has a pending invite.' }, { status: 409 });
    }
  }
  if (normalizedUsername) {
    const syntheticEmail = `${normalizedUsername}@makhzoon.local`;
    if (await authEmailExists(syntheticEmail)) {
      return NextResponse.json({ error: 'An account with this username already exists.' }, { status: 409 });
    }
    const pending = await getPendingInviteForUsername(tenant.organizationId, normalizedUsername);
    if (pending) {
      return NextResponse.json({ error: 'This username already has a pending invite.' }, { status: 409 });
    }
  }

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const id = await createInvite({
    organizationId: tenant.organizationId,
    email: normalizedEmail,
    username: normalizedUsername,
    displayName,
    role,
    token,
    invitedBy: user.uid,
    invitedByEmail: user.email,
    invitedByName: user.displayName,
    expiresAt,
    permissions: (permissions as import('@/types').UserPermissions | null | undefined) ?? null,
  });

  const org = await getOrganizationById(tenant.organizationId);
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

  auditLog.queue({
    tenant,
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
