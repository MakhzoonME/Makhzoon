import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getInviteByToken, markInviteAccepted } from '@/lib/firestore/invites';
import { createUser } from '@/lib/firestore/users';
import { acceptInviteSchema } from '@/lib/validations/invite.schema';
import { writeAuditLog } from '@/lib/audit/logger';

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
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

  const existing = await adminAuth.getUserByEmail(invite.email).catch(() => null);
  if (existing) return NextResponse.json({ error: 'An account already exists for this email' }, { status: 409 });

  const newUser = await adminAuth.createUser({
    email: invite.email,
    displayName: invite.displayName,
    password: parsed.data.password,
    emailVerified: true,
  });

  await adminAuth.setCustomUserClaims(newUser.uid, {
    role: invite.role,
    organizationId: invite.organizationId,
  });

  await createUser(newUser.uid, {
    organizationId: invite.organizationId,
    email: invite.email,
    displayName: invite.displayName,
    role: invite.role,
    status: 'active',
    createdBy: invite.invitedBy,
    updatedBy: invite.invitedBy,
  });

  await markInviteAccepted(invite.id, newUser.uid);

  await writeAuditLog({
    organizationId: invite.organizationId,
    userId: newUser.uid,
    role: invite.role,
    action: 'INVITE_ACCEPTED',
    module: 'users',
    recordId: invite.id,
    newValue: { email: invite.email, role: invite.role },
  });

  return NextResponse.json({ success: true, email: invite.email });
}
