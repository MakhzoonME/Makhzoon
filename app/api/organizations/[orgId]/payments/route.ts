import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getPaymentLogs, createPaymentLog } from '@/lib/db/payment-logs';
import { getSubscriptionByOrg } from '@/lib/db/subscriptions';
import { queueAuditLog } from '@/lib/audit/logger';
import { paymentLogSchema } from '@/lib/validations/payment-log.schema';

// Payment records are financial data — restricted to super_admin and makhzoon_admin.
const PAYMENT_ROLES = new Set(['super_admin', 'makhzoon_admin']);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!PAYMENT_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orgId } = await params;
    const logs = await getPaymentLogs(orgId);
    return NextResponse.json(logs);
  } catch (err) {
    console.error('[GET /api/organizations/[orgId]/payments]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orgId } = await params;
    const sub = await getSubscriptionByOrg(orgId);
    if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

    const body = await req.json();
    const parsed = paymentLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    // Force the subscription to the org's actual one — never trust client.
    const log = await createPaymentLog(user.uid, {
      ...parsed.data,
      organizationId: orgId,
      subscriptionId: sub.id,
    });

    queueAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'PAYMENT_RECORDED',
      module: 'payments',
      recordId: log.id,
      newValue: { amount: log.amount, currency: log.currency, method: log.method },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (err) {
    console.error('[POST /api/organizations/[orgId]/payments]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
