import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requirePermission } from '@/lib/permissions/require';
import { getInviteByToken, revokeInvite } from '@/lib/db/invites';
import { auditLog } from '@/lib/platform/audit';

export async function POST(_req: NextRequest, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  try {
    const tenant = await resolveTenant();
    const user = tenant.user;
    requirePermission(user, 'settings', 'users');

    const invite = await getInviteByToken(params.token);
    if (!invite || invite.organizationId !== tenant.organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: `Cannot revoke ${invite.status} invite` }, { status: 400 });
    }

    await revokeInvite(invite.id, user.uid);

    auditLog.queue({
      tenant,
      action: 'INVITE_REVOKED',
      module: 'users',
      recordId: invite.id,
      oldValue: { email: invite.email, role: invite.role },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/invites/[token]/revoke]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
