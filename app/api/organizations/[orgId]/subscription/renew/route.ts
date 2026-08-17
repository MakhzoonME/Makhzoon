import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getSubscriptionByOrg, renewSubscription } from '@/lib/db/subscriptions';
import { getPackageById } from '@/lib/db/packages';
import { createInvoice } from '@/lib/db/invoices';
import { computeInvoice } from '@/lib/billing/compute-invoice';
import { queueAuditLog } from '@/lib/audit/logger';

const renewSchema = z.object({
  endDate: z.union([z.string().datetime(), z.string().date(), z.date()]).optional(),
  generateInvoiceNow: z.boolean().optional(),
}).refine(
  (data) => !data.endDate || new Date(data.endDate).getTime() > Date.now(),
  { message: 'End date must be after today', path: ['endDate'] },
);

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
      return NextResponse.json({ error: 'Cancelled subscriptions cannot be renewed — create a new one instead' }, { status: 409 });
    }

    const parsed = renewSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const base = subscription.endDate > new Date() ? subscription.endDate : new Date();
    const newEndDate = parsed.data.endDate ? new Date(parsed.data.endDate) : new Date(base.setMonth(base.getMonth() + 1));

    await renewSubscription(subscription.id, {
      newEndDate,
      currentStatus: subscription.status,
      renewedBy: user.uid,
    });

    let invoiceId: string | undefined;
    if (parsed.data.generateInvoiceNow && subscription.packageId) {
      const pkg = await getPackageById(subscription.packageId);
      if (pkg) {
        const computed = computeInvoice(subscription, pkg, new Date());
        const periodStart = new Date();
        const periodEnd = newEndDate;
        const graceDeadline = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        const invoice = await createInvoice({
          organizationId: orgId,
          subscriptionId: subscription.id,
          periodStart,
          periodEnd,
          lineItems: computed.lineItems,
          subtotal: computed.subtotal,
          foundingCohortDiscount: computed.foundingCohortDiscount,
          total: computed.total,
          currency: computed.currency,
          dueDate: periodStart,
          graceDeadline,
        });
        invoiceId = invoice?.id;
      }
    }

    queueAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'SUBSCRIPTION_RENEWED',
      module: 'subscriptions',
      recordId: subscription.id,
      oldValue: { endDate: subscription.endDate, status: subscription.status },
      newValue: { endDate: newEndDate, invoiceId },
    });

    return NextResponse.json({ success: true, newEndDate, invoiceId });
  } catch (err) {
    console.error('[POST /api/organizations/[orgId]/subscription/renew]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
