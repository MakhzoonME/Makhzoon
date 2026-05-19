import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getSubscriptionByOrg, updateSubscription } from '@/lib/db/subscriptions';
import { queueAuditLog } from '@/lib/audit/logger';
import { subscriptionUpdateSchema } from '@/lib/validations/subscription.schema';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { orgId } = await params;

    const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);
    if (!SUPERADMIN_ROLES.has(user.role) && user.organizationId !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const subscription = await getSubscriptionByOrg(orgId);
    if (!subscription) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(subscription, { headers: { 'Cache-Control': 'no-store' } });
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
    const parsed = subscriptionUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;

    // Auto-compute status based on endDate if not explicitly set
    if (data.status === undefined) {
      const now = new Date();
      const resolvedEndDate = data.endDate ?? subscription.endDate;
      if (resolvedEndDate < now) {
        data.status = 'EXPIRED';
      } else if (resolvedEndDate >= now && subscription.status === 'EXPIRED') {
        data.status = 'ACTIVE';
      }
    }

    await updateSubscription(subscription.id, {
      ...data,
      updatedBy: user.uid,
    });

    // Pick the most-specific audit action so the trail is meaningful.
    let action: 'SUBSCRIPTION_UPDATED' | 'SUBSCRIPTION_PACKAGE_ASSIGNED' | 'SUBSCRIPTION_FEATURE_UPDATED' =
      'SUBSCRIPTION_UPDATED';
    if (data.packageId !== undefined && data.packageId !== subscription.packageId) {
      action = 'SUBSCRIPTION_PACKAGE_ASSIGNED';
    } else if (data.features !== undefined) {
      action = 'SUBSCRIPTION_FEATURE_UPDATED';
    }

    queueAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action,
      module: 'subscriptions',
      recordId: subscription.id,
      oldValue: {
        packageId: subscription.packageId,
        status: subscription.status,
        endDate: subscription.endDate,
      },
      newValue: data as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PUT /api/organizations/[orgId]/subscription]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
