import { NextRequest, NextResponse } from 'next/server';
import { updateSubscription } from '@/lib/db/subscriptions';
import {
  listPendingInvoicesPastGrace,
  markInvoiceReadOnlyTriggered,
} from '@/lib/db/invoices';
import { getOrganizationById } from '@/lib/db/organizations';
import { sendEmail } from '@/lib/email/resend';
import { queueAuditLog } from '@/lib/audit/logger';
import { checkCronSecret } from '@/lib/cron-auth';
import { logServerEvent } from '@/lib/logging/log-server-event';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Daily: any PENDING invoice past its 7-day grace deadline flips to
// READ_ONLY_TRIGGERED and moves its subscription to READ_ONLY (writes blocked
// by resolveTenant). Idempotent — only PENDING invoices are picked up.
export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!checkCronSecret(secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const overdue = await listPendingInvoicesPastGrace(now);

    let enforced = 0;
    for (const inv of overdue) {
      await markInvoiceReadOnlyTriggered(inv.id);
      if (inv.subscriptionId) {
        await updateSubscription(inv.subscriptionId, {
          status: 'READ_ONLY',
          graceStartedAt: inv.dueDate,
          updatedBy: 'system',
        });
      }
      enforced += 1;

      queueAuditLog({
        organizationId: inv.organizationId,
        userId: 'system',
        role: 'super_admin',
        action: 'SUBSCRIPTION_READ_ONLY' as const,
        module: 'subscriptions',
        recordId: inv.id,
        newValue: { reason: 'grace_deadline_passed', total: inv.total, currency: inv.currency },
      });

      const org = await getOrganizationById(inv.organizationId);
      const internal = process.env.BILLING_NOTIFY_EMAIL;
      const to = [org?.contactEmail, internal].filter((x): x is string => !!x);
      if (to.length) {
        await sendEmail({
          to,
          subject: `Makhzoon account read-only — ${org?.name ?? 'your organization'}`,
          html: `<p>An invoice of <strong>${inv.total} ${inv.currency}</strong> is past its 7-day grace period, so your Makhzoon account has moved to <strong>read-only</strong> mode. Your data is safe; creating or editing is paused until payment is received. Please contact support to settle the invoice and restore full access.</p>`,
          text: `Your Makhzoon account is now read-only (invoice ${inv.total} ${inv.currency} past grace). Contact support to restore access.`,
        }).catch((e) => {
          if (process.env.NODE_ENV !== 'production') console.warn('[grace-enforcement] email failed:', e);
        });
      }
    }

    logServerEvent('info', 'cron/grace-enforcement', `Enforced read-only on ${enforced} org(s)`, {
      detail: { enforced },
    });
    return NextResponse.json({ ok: true, enforced });
  } catch (err) {
    console.error('[GET /api/cron/grace-enforcement]', err);
    logServerEvent('error', 'cron/grace-enforcement', err instanceof Error ? err.message : 'Cron failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
