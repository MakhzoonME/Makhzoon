import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrganizationById } from '@/lib/db/organizations';
import { warrantyAlertEmail } from '@/lib/email/templates';
import { queueAuditLog } from '@/lib/audit/logger';
import { checkCronSecret } from '@/lib/cron-auth';
import { logServerEvent } from '@/lib/logging/log-server-event';
import { notificationQueue } from '@/lib/notifications/notification-queue';

type Row = Record<string, unknown>;

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type WarrantyDoc = {
  id: string;
  organizationId: string;
  assetId: string;
  vendor: string;
  endDate: Date;
  reminder?: boolean;
};

export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!checkCronSecret(secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const windowEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const pastWindow = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data: warrantyRows, error: wErr } = await supabaseAdmin
      .from('warranties')
      .select('id, organization_id, asset_id, vendor, end_date, reminder')
      .gte('end_date', pastWindow.toISOString())
      .lte('end_date', windowEnd.toISOString());
    if (wErr) throw wErr;

    const byOrg = new Map<string, WarrantyDoc[]>();
    for (const d of (warrantyRows ?? []) as Row[]) {
      if (d.reminder === false) continue;
      const w: WarrantyDoc = {
        id: d.id as string,
        organizationId: d.organization_id as string,
        assetId: d.asset_id as string,
        vendor: (d.vendor as string) ?? 'Unknown vendor',
        endDate: new Date(d.end_date as string),
        reminder: d.reminder as boolean | undefined,
      };
      const list = byOrg.get(w.organizationId) ?? [];
      list.push(w);
      byOrg.set(w.organizationId, list);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? req.nextUrl.origin;
    const results: { orgId: string; items: number; skipped: boolean }[] = [];

    const entries: [string, WarrantyDoc[]][] = [];
    byOrg.forEach((v, k) => entries.push([k, v]));

    for (const [orgId, warranties] of entries) {
      const org = await getOrganizationById(orgId);
      if (!org) {
        results.push({ orgId, items: warranties.length, skipped: true });
        continue;
      }

      const orgName = org.name ?? 'Your organization';
      const assetIds: string[] = Array.from(new Set(warranties.map((w: WarrantyDoc) => w.assetId)));
      const assetNames = new Map<string, string>();

      if (assetIds.length > 0) {
        const { data: aRows } = await supabaseAdmin
          .from('assets')
          .select('id, name')
          .in('id', assetIds);
        for (const a of (aRows ?? []) as Row[]) {
          assetNames.set(a.id as string, (a.name as string) ?? 'Asset');
        }
      }

      const items = warranties
        .map((w: WarrantyDoc) => {
          const daysLeft = Math.round((w.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          return {
            assetName: assetNames.get(w.assetId) ?? 'Asset',
            vendor: w.vendor,
            endDate: w.endDate.toISOString().slice(0, 10),
            daysLeft,
            assetUrl: `${baseUrl}/assets/${w.assetId}`,
          };
        })
        .sort((a: { daysLeft: number }, b: { daysLeft: number }) => a.daysLeft - b.daysLeft);

      const { html, text } = warrantyAlertEmail({ orgName, items, dashboardUrl: `${baseUrl}/warranties` });

      // Route through the notification queue instead of emailing admins directly —
      // this respects per-user notification_preferences and also creates the
      // in-app bell notification, which the old direct-email path skipped entirely.
      await notificationQueue.send({
        tenant: { organizationId: orgId },
        eventType: 'warranty.expiring',
        data: { itemCount: items.length, nearestDaysLeft: items[0]?.daysLeft ?? null },
        link: `${baseUrl}/warranties`,
        titleOverride: `Warranty alerts for ${orgName}`,
        emailSubject: `Warranty alerts for ${orgName}`,
        emailHtml: html,
        emailText: text,
      });

      queueAuditLog({
        organizationId: orgId,
        userId: 'system',
        role: 'super_admin',
        action: 'WARRANTY_ALERT_SENT',
        module: 'warranties',
        newValue: { items: items.length },
      });

      results.push({ orgId, items: items.length, skipped: false });
    }

    logServerEvent('info', 'cron/warranty-alerts',
      `Processed ${results.length} org(s)`,
      { detail: { orgs: results.length } });

    return NextResponse.json({ ok: true, orgs: results.length, results });
  } catch (err) {
    console.error('[GET /api/cron/warranty-alerts]', err);
    logServerEvent('error', 'cron/warranty-alerts',
      err instanceof Error ? err.message : 'Cron failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
