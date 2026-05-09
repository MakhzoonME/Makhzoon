import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getOrgUsage } from '@/lib/db/usage';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { orgId } = await params;
    const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);
    if (!SUPERADMIN_ROLES.has(user.role) && user.organizationId !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const usage = await getOrgUsage(orgId);
    return NextResponse.json(usage);
  } catch (err) {
    console.error('[GET /api/organizations/[orgId]/usage]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
