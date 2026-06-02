import { NextRequest, NextResponse } from 'next/server';
import { createAuthUser, authEmailExists } from '@/lib/supabase/auth-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { checkOrigin } from '@/lib/csrf';
import { getInviteByToken, markInviteAccepted } from '@/lib/db/invites';
import { createUser } from '@/lib/db/users';
import { acceptInviteSchema } from '@/lib/validations/invite.schema';
import { queueAuditLog } from '@/lib/audit/logger';

export async function POST(req: NextRequest, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  try {
    // SECURITY: Rate limit invite acceptance (5 per IP per hour)
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit(
      `invite-accept:${clientIp}`,
      5,
      60 * 60 * 1000,
      { action: 'accept invites' }
    );
    if (rateLimitResult) return rateLimitResult;

    // SECURITY: Validate origin to prevent CSRF
    const originCheck = checkOrigin(req);
    if (originCheck) return originCheck;

    const invite = await getInviteByToken(params.token);
    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: `Invite ${invite.status}` }, { status: 410 });
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
    }

    const body = await req.json();
    const parsed = acceptInviteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const { password } = parsed.data;

    let uid: string;
    let userEmail: string;

    if (invite.email) {
      if (await authEmailExists(invite.email)) {
        return NextResponse.json({ error: 'An account already exists for this email' }, { status: 409 });
      }
      const newUser = await createAuthUser({
        email: invite.email,
        displayName: invite.displayName,
        password,
        role: invite.role,
        organizationId: invite.organizationId,
      });
      uid = newUser.uid;
      userEmail = invite.email;
    } else if (invite.username) {
      const syntheticEmail = `${invite.username}@makhzoon.local`;
      if (await authEmailExists(syntheticEmail)) {
        return NextResponse.json({ error: 'This username is already taken' }, { status: 409 });
      }
      const newUser = await createAuthUser({
        email: syntheticEmail,
        displayName: invite.displayName,
        password,
        role: invite.role,
        organizationId: invite.organizationId,
      });
      uid = newUser.uid;
      userEmail = syntheticEmail;
    } else {
      return NextResponse.json({ error: 'Invite has no email or username' }, { status: 400 });
    }

    await createUser(uid, {
      organizationId: invite.organizationId,
      email: userEmail,
      username: invite.username,
      displayName: invite.displayName,
      role: invite.role,
      status: 'active',
      permissions: invite.permissions ?? null,
      createdBy: invite.invitedBy,
      updatedBy: invite.invitedBy,
    });

    await markInviteAccepted(invite.id, uid);

    queueAuditLog({
      organizationId: invite.organizationId,
      userId: uid,
      role: invite.role,
      action: 'INVITE_ACCEPTED',
      module: 'users',
      recordId: invite.id,
      newValue: { email: invite.email, username: invite.username, role: invite.role },
    });

    return NextResponse.json({ success: true, email: userEmail });
  } catch (err) {
    console.error('[POST /api/invites/[token]/accept]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
