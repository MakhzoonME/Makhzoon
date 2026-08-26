import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPackageById } from '@/lib/db/packages';
import { getSubscriptionsByOrgs } from '@/lib/db/subscriptions';
import { getOrganizationById } from '@/lib/db/organizations';
import { createInvoice } from '@/lib/db/invoices';
import { computeInvoice } from '@/lib/billing/compute-invoice';
import { sendEmail } from '@/lib/email/resend';
import { queueAuditLog } from '@/lib/audit/logger';
import { checkCronSecret } from '@/lib/cron-auth';
import { logServerEvent } from '@/lib/logging/log-server-event';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Bill orgs whose billing anchor is today. Deterministic amounts (block model),
// PENDING invoice due today with a 7-day grace deadline. Idempotent: the unique
// (subscription_id, period_start) index means re-runs don't double-bill.
export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!checkCronSecret(secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    // Anchors are stored 1..28; treat any month-end day >= 28 as 28 so
    // February etc. still bill 28-anchored orgs.
    const dayOfMonth = Math.min(now.getUTCDate(), 28);

    const { data: subRows, error } = await supabaseAdmin
      .from('subscriptions')
      .select('organization_id')
      .in('status', ['ACTIVE', 'GRACE'])
      .eq('billing_anchor_day', dayOfMonth);
    if (error) throw error;

    const orgIds = [...new Set((subRows ?? []).map((r) => (r as Record<string, unknown>).organization_id as string))];
    const subs = await getSubscriptionsByOrgs(orgIds);

    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()));
    const graceDeadline = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    let created = 0;
    for (const sub of subs) {
      if (!sub.packageId) continue; // trial / unassigned — nothing to bill
      const pkg = await getPackageById(sub.packageId);
      if (!pkg) continue;

      const computed = computeInvoice(sub, pkg, now);
      const invoice = await createInvoice({
        organizationId: sub.organizationId,
        subscriptionId: sub.id,
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
      if (!invoice) continue; // already billed for this period

      created += 1;
      queueAuditLog({
        organizationId: sub.organizationId,
        userId: 'system',
        role: 'super_admin',
        action: 'INVOICE_GENERATED' as const,
        module: 'subscriptions',
        recordId: invoice.id,
        newValue: { total: invoice.total, currency: invoice.currency, dueDate: invoice.dueDate },
      });

      // Notify the org's contact + (optionally) an internal billing address.
      const org = await getOrganizationById(sub.organizationId);
      const internal = process.env.BILLING_NOTIFY_EMAIL;
      const to = [org?.contactEmail, internal].filter((x): x is string => !!x);
      if (to.length) {
        const rows = computed.lineItems
          .map((li) => `<tr><td>${li.description}</td><td align="right">${li.quantity} × ${li.unitPrice}</td><td align="right">${li.total} ${computed.currency}</td></tr>`)
          .join('');
        await sendEmail({
          to,
          subject: `Makhzoon invoice — ${org?.name ?? 'your organization'} (${computed.total} ${computed.currency})`,
          html: `<p>Your Makhzoon subscription invoice for this period:</p>
            <table cellpadding="6" style="border-collapse:collapse">${rows}
            <tr><td colspan="2" align="right"><strong>Subtotal</strong></td><td align="right">${computed.subtotal} ${computed.currency}</td></tr>
            ${computed.foundingCohortDiscount ? `<tr><td colspan="2" align="right">Founding-cohort discount</td><td align="right">-${computed.foundingCohortDiscount} ${computed.currency}</td></tr>` : ''}
            <tr><td colspan="2" align="right"><strong>Total due</strong></td><td align="right"><strong>${computed.total} ${computed.currency}</strong></td></tr></table>
            <p>Due ${periodStart.toDateString()}. Please arrange payment within 7 days to avoid a service interruption.</p>`,
          text: `Makhzoon invoice — total ${computed.total} ${computed.currency}, due ${periodStart.toDateString()}.`,
        }).catch((e) => {
          if (process.env.NODE_ENV !== 'production') console.warn('[monthly-billing] email failed:', e);
        });
      }
    }

    logServerEvent('info', 'cron/monthly-billing', `Generated ${created} invoice(s)`, {
      detail: { created, candidates: subs.length },
    });
    return NextResponse.json({ ok: true, created, candidates: subs.length });
  } catch (err) {
    console.error('[GET /api/cron/monthly-billing]', err);
    logServerEvent('error', 'cron/monthly-billing', err instanceof Error ? err.message : 'Cron failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
