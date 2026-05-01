import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getInviteByToken, revokeInvite } from '@/lib/db/invites';
import { writeAuditLog } from '@/lib/audit/logger';

export async function POST(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const invite = await getInviteByToken(params.token);
    if (!invite || invite.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: `Cannot revoke ${invite.status} invite` }, { status: 400 });
    }

    await revokeInvite(invite.id, user.uid);

    await writeAuditLog({
      organizationId: user.organizationId,
      userId: user.uid,
      role: user.role,
      action: 'INVITE_REVOKED',
      module: 'users',
      recordId: invite.id,
      oldValue: { email: invite.email, role: invite.role },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/invites/[token]/revoke]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
