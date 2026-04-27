import { NextRequest, NextResponse } from 'next/server';
import { getInviteByToken } from '@/lib/firestore/invites';
import { getOrganizationById } from '@/lib/firestore/organizations';

function maskPhone(phone: string): string {
  // +966501234567 → +966****4567
  if (phone.length <= 6) return phone;
  return phone.slice(0, 4) + '****' + phone.slice(-4);
}

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const invite = await getInviteByToken(params.token);
    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: `Invite ${invite.status}` }, { status: 410 });
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
    }

    const org = await getOrganizationById(invite.organizationId);
    return NextResponse.json({
      email: invite.email,
      // Return full phone for Firebase Phone Auth on the acceptance page.
      // The token itself (24-byte random) protects this endpoint.
      phone: invite.phone,
      phoneDisplay: invite.phone ? maskPhone(invite.phone) : undefined,
      channel: invite.channel,
      displayName: invite.displayName,
      role: invite.role,
      orgName: org?.name ?? 'Workspace',
      invitedByName: invite.invitedByName ?? invite.invitedByEmail,
      expiresAt: invite.expiresAt,
    });
  } catch (err) {
    console.error('[GET /api/invites/[token]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
