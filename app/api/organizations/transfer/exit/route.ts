import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { queueAuditLog } from '@/lib/audit/logger';

export async function POST() {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);
    if (!SUPERADMIN_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const cookieStore = await cookies();
    const exitingOrgId = cookieStore.get('transferOrgId')?.value ?? null;
    const isSecure = process.env.NODE_ENV !== 'development';
    cookieStore.set('transferOrgId', '', { maxAge: 0, path: '/', httpOnly: true, secure: isSecure, sameSite: 'strict' });

    if (exitingOrgId) {
      queueAuditLog({
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
  } catch (err) {
    console.error('[POST /api/organizations/transfer/exit]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
