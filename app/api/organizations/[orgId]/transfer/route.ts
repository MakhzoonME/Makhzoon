import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { writeAuditLog } from '@/lib/audit/logger';
import { cookies } from 'next/headers';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { orgId } = await params;
  const cookieStore = await cookies();
  cookieStore.set('transferOrgId', orgId, { httpOnly: true, path: '/', sameSite: 'lax' });

  await writeAuditLog({
    organizationId: orgId,
    userId: user.uid,
    role: user.role,
    action: 'TRANSFER_MODE_ENTERED',
    module: 'organizations',
    recordId: orgId,
    transferMode: true,
  });

  return NextResponse.json({ success: true });
}
