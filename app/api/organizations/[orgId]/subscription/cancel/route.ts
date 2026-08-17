import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getSubscriptionByOrg, cancelSubscription } from '@/lib/db/subscriptions';
import { queueAuditLog } from '@/lib/audit/logger';

const cancelSchema = z.object({
  reason: z.string().trim().min(1, 'A cancellation reason is required').max(500),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orgId } = await params;
    const subscription = await getSubscriptionByOrg(orgId);
    if (!subscription) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (subscription.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Subscription is already cancelled' }, { status: 409 });
    }

    const parsed = cancelSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    await cancelSubscription(subscription.id, { reason: parsed.data.reason, cancelledBy: user.uid });

    queueAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'SUBSCRIPTION_CANCELLED',
      module: 'subscriptions',
      recordId: subscription.id,
      oldValue: { status: subscription.status },
      newValue: { reason: parsed.data.reason },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/organizations/[orgId]/subscription/cancel]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
