import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getOrganizations, getOrganizationById } from '@/lib/db/organizations';
import { authEmailExists } from '@/lib/supabase/auth-admin';
import { createInvite, getPendingInviteForEmail } from '@/lib/db/invites';
import { generateInviteToken } from '@/lib/db/invites';
import { sendEmail } from '@/lib/email/resend';
import { inviteEmail } from '@/lib/email/templates';
import { generateInviteQRDataUrl } from '@/lib/qr';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { UserPermissions, InviteRole } from '@/types';

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

const ROLE_OPTIONS = new Set(['org_owner', 'admin', 'staff']);

export async function GET(_req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!SUPERADMIN_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orgs = await getOrganizations();
    return NextResponse.json(orgs.map((o) => ({ id: o.id, name: o.name })));
  } catch (err) {
    console.error('[GET /api/superadmin/invite]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!SUPERADMIN_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit(`invite:${clientIp}`, 20, 60 * 60 * 1000, { action: 'send invites' });
    if (rateLimitResult) return rateLimitResult;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 422 });

    const { orgId, email, displayName, role, permissions } = body as {
      orgId?: string;
      email?: string;
      displayName?: string;
      role?: string;
      permissions?: UserPermissions;
    };

    if (!orgId || typeof orgId !== 'string') return NextResponse.json({ error: 'orgId is required' }, { status: 422 });
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 422 });
    }
    if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 2) {
      return NextResponse.json({ error: 'displayName (full name) is required' }, { status: 422 });
    }
    if (!role || !ROLE_OPTIONS.has(role)) {
      return NextResponse.json({ error: 'Valid role is required' }, { status: 422 });
    }

    const org = await getOrganizationById(orgId);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const normalizedEmail = email.trim().toLowerCase();

    if (await authEmailExists(normalizedEmail)) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    const pending = await getPendingInviteForEmail(orgId, normalizedEmail);
    if (pending) return NextResponse.json({ error: 'This email already has a pending invite' }, { status: 409 });

    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const id = await createInvite({
      organizationId: orgId,
      email: normalizedEmail,
      username: undefined,
      displayName: displayName.trim(),
      role: role as InviteRole,
      token,
      invitedBy: user.uid,
      invitedByEmail: user.email,
      invitedByName: user.displayName ?? 'Superadmin',
      expiresAt,
      permissions: permissions ?? null,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? req.nextUrl.origin;
    const acceptUrl = `${baseUrl}/invites/${token}`;
    let messageSent = false;

    const { html, text } = inviteEmail({
      orgName: org.name,
      inviterName: user.displayName || user.email,
      acceptUrl,
      role: role as InviteRole,
    });

    try {
      const result = await sendEmail({ to: normalizedEmail, subject: `You're invited to ${org.name}`, html, text });
      messageSent = !result.skipped;
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('[invite] Email send failed:', err);
    }

    const qrDataUrl = await generateInviteQRDataUrl(acceptUrl);

    return NextResponse.json({ id, acceptUrl, qrDataUrl, expiresAt, messageSent }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/superadmin/invite]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}