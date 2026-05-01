import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getOrgUsage } from '@/lib/db/usage';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { orgId } = await params;
    if (user.role !== 'super_admin' && user.organizationId !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const usage = await getOrgUsage(orgId);
    return NextResponse.json(usage);
  } catch (err) {
    console.error('[GET /api/organizations/[orgId]/usage]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
