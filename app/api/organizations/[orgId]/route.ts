import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getOrganizationById } from '@/lib/firestore/organizations';
import { getSubscriptionByOrg } from '@/lib/firestore/subscriptions';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orgId } = await params;
    const org = await getOrganizationById(orgId);
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const subscription = await getSubscriptionByOrg(orgId);
    return NextResponse.json({ ...org, subscription });
  } catch (err) {
    console.error('[GET /api/organizations/[orgId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
