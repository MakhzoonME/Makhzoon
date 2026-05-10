import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { queueAuditLog } from '@/lib/audit/logger';
import { cookies } from 'next/headers';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);
    if (!SUPERADMIN_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orgId } = await params;

    const orgDoc = await adminDb.collection('organizations').doc(orgId).get();
    if (!orgDoc.exists) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    const subdomain = (orgDoc.data()?.subdomain as string) ?? null;
    const name = (orgDoc.data()?.name as string) ?? null;

    const cookieStore = await cookies();
    const isSecure = process.env.NODE_ENV !== 'development';
    cookieStore.set('transferOrgId', orgId, {
      httpOnly: true,
      secure: isSecure,
      path: '/',
      sameSite: 'strict',
      maxAge: 3600,
    });

    queueAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'TRANSFER_MODE_ENTERED',
      module: 'organizations',
      recordId: orgId,
      transferMode: true,
    });

    return NextResponse.json({ success: true, orgId, name, subdomain });
  } catch (err) {
    console.error('[POST /api/organizations/[orgId]/transfer]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
