import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getInviteByToken, markInviteAccepted } from '@/lib/db/invites';
import { createUser } from '@/lib/db/users';
import { acceptInviteSchema } from '@/lib/validations/invite.schema';
import { writeAuditLog } from '@/lib/audit/logger';

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
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
      const existing = await adminAuth.getUserByEmail(invite.email).catch(() => null);
      if (existing) {
        return NextResponse.json({ error: 'An account already exists for this email' }, { status: 409 });
      }
      const newUser = await adminAuth.createUser({
        email: invite.email,
        displayName: invite.displayName,
        password,
        emailVerified: true,
      });
      uid = newUser.uid;
      userEmail = invite.email;
    } else if (invite.username) {
      const syntheticEmail = `${invite.username}@makhzoon.local`;
      const existing = await adminAuth.getUserByEmail(syntheticEmail).catch(() => null);
      if (existing) {
        return NextResponse.json({ error: 'This username is already taken' }, { status: 409 });
      }
      const newUser = await adminAuth.createUser({
        email: syntheticEmail,
        displayName: invite.displayName,
        password,
        emailVerified: true,
      });
      uid = newUser.uid;
      userEmail = syntheticEmail;
    } else {
      return NextResponse.json({ error: 'Invite has no email or username' }, { status: 400 });
    }

    await adminAuth.setCustomUserClaims(uid, {
      role: invite.role,
      organizationId: invite.organizationId,
    });

    await createUser(uid, {
      organizationId: invite.organizationId,
      email: invite.email,
      username: invite.username,
      displayName: invite.displayName,
      role: invite.role,
      status: 'active',
      permissions: invite.permissions ?? null,
      createdBy: invite.invitedBy,
      updatedBy: invite.invitedBy,
    });

    await markInviteAccepted(invite.id, uid);

    await writeAuditLog({
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
