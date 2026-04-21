import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { writeAuditLog } from '@/lib/audit/logger';

export async function POST() {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const cookieStore = await cookies();
  const exitingOrgId = cookieStore.get('transferOrgId')?.value ?? null;
  cookieStore.delete('transferOrgId');

  if (exitingOrgId) {
    await writeAuditLog({
      organizationId: exitingOrgId,
      userId: user.uid,
      role: user.role,
      action: 'TRANSFER_MODE_EXITED',
      module: 'organizations',
      recordId: exitingOrgId,
      transferMode: true,
    });
  }

  return NextResponse.json({ success: true });
}
