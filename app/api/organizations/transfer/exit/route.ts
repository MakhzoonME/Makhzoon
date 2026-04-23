import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { writeAuditLog } from '@/lib/audit/logger';
import { getCookieDomain } from '@/lib/subdomain';

export async function POST() {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const hdrs = await headers();
  const cookieDomain = getCookieDomain(hdrs.get('host'));
  const cookieStore = await cookies();
  const exitingOrgId = cookieStore.get('transferOrgId')?.value ?? null;
  cookieStore.set('transferOrgId', '', {
    maxAge: 0,
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });

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
