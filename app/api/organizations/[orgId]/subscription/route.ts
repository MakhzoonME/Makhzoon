import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getSubscriptionByOrg, updateSubscription } from '@/lib/firestore/subscriptions';
import { writeAuditLog } from '@/lib/audit/logger';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { orgId } = await params;

    if (user.role !== 'super_admin' && user.organizationId !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const subscription = await getSubscriptionByOrg(orgId);
    if (!subscription) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(subscription);
  } catch (err) {
    console.error('[GET /api/organizations/[orgId]/subscription]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orgId } = await params;
    const subscription = await getSubscriptionByOrg(orgId);
    if (!subscription) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    await updateSubscription(subscription.id, {
      ...body,
      updatedBy: user.uid,
    });

    await writeAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'SUBSCRIPTION_UPDATED',
      module: 'subscriptions',
      recordId: subscription.id,
      newValue: body,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PUT /api/organizations/[orgId]/subscription]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
