import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { getSubscriptionByOrg, applyPlanChangeNow, schedulePlanChange } from '@/lib/db/subscriptions';
import { getPackageById } from '@/lib/db/packages';
import { createInvoice } from '@/lib/db/invoices';
import { computeInvoice } from '@/lib/billing/compute-invoice';
import { queueAuditLog } from '@/lib/audit/logger';

const changePlanSchema = z.object({
  packageId: z.string().min(1),
  mode: z.enum(['upgrade', 'downgrade']),
  generateInvoiceNow: z.boolean().optional(),
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
      return NextResponse.json({ error: 'Cancelled subscriptions cannot change plan' }, { status: 409 });
    }

    const parsed = changePlanSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const newPkg = await getPackageById(parsed.data.packageId);
    if (!newPkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

    if (parsed.data.mode === 'downgrade') {
      await schedulePlanChange(subscription.id, {
        pendingPackageId: newPkg.id,
        effectiveAt: subscription.endDate,
        scheduledBy: user.uid,
      });
      queueAuditLog({
        organizationId: orgId,
        userId: user.uid,
        role: user.role,
        action: 'SUBSCRIPTION_DOWNGRADE_SCHEDULED',
        module: 'subscriptions',
        recordId: subscription.id,
        oldValue: { packageId: subscription.packageId },
        newValue: { pendingPackageId: newPkg.id, effectiveAt: subscription.endDate },
      });
      return NextResponse.json({ success: true, effectiveAt: subscription.endDate });
    }

    // Upgrade — applies immediately.
    await applyPlanChangeNow(subscription.id, { packageId: newPkg.id, appliedBy: user.uid });

    let invoiceId: string | undefined;
    let preview;
    const projectedSub = { ...subscription, packageId: newPkg.id };
    preview = computeInvoice(projectedSub, newPkg, new Date());

    if (parsed.data.generateInvoiceNow) {
      const periodStart = new Date();
      const graceDeadline = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const invoice = await createInvoice({
        organizationId: orgId,
        subscriptionId: subscription.id,
        periodStart,
        periodEnd: subscription.endDate,
        lineItems: preview.lineItems,
        subtotal: preview.subtotal,
        foundingCohortDiscount: preview.foundingCohortDiscount,
        total: preview.total,
        currency: preview.currency,
        dueDate: periodStart,
        graceDeadline,
      });
      invoiceId = invoice?.id;
    }

    queueAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'SUBSCRIPTION_UPGRADED',
      module: 'subscriptions',
      recordId: subscription.id,
      oldValue: { packageId: subscription.packageId },
      newValue: { packageId: newPkg.id, invoiceId },
    });

    return NextResponse.json({ success: true, preview, invoiceId });
  } catch (err) {
    console.error('[POST /api/organizations/[orgId]/subscription/change-plan]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
