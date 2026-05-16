import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrganizationById } from '@/lib/db/organizations';
import { sendEmail } from '@/lib/email/resend';
import { warrantyAlertEmail } from '@/lib/email/templates';
import { queueAuditLog } from '@/lib/audit/logger';

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
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
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
    const results: { orgId: string; admins: number; items: number; sent: number; skipped: boolean }[] = [];

    const entries: [string, WarrantyDoc[]][] = [];
    byOrg.forEach((v, k) => entries.push([k, v]));

    for (const [orgId, warranties] of entries) {
      const [org, adminsRes] = await Promise.all([
        getOrganizationById(orgId),
        supabaseAdmin
          .from('users')
          .select('email')
          .eq('organization_id', orgId)
          .eq('role', 'admin'),
      ]);

      const admins = (adminsRes.data ?? []) as Row[];
      if (!org || admins.length === 0) {
        results.push({ orgId, admins: admins.length, items: warranties.length, sent: 0, skipped: true });
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
      const recipients = admins.map((a) => a.email as string).filter(Boolean);

      let sent = 0;
      for (const to of recipients) {
        const res = await sendEmail({ to, subject: `Warranty alerts for ${orgName}`, html, text });
        if (!res.skipped) sent++;
      }

      queueAuditLog({
        organizationId: orgId,
        userId: 'system',
        role: 'super_admin',
        action: 'WARRANTY_ALERT_SENT',
        module: 'warranties',
        newValue: { items: items.length, recipients: recipients.length, sent },
      });

      results.push({ orgId, admins: admins.length, items: items.length, sent, skipped: false });
    }

    return NextResponse.json({ ok: true, orgs: results.length, results });
  } catch (err) {
    console.error('[GET /api/cron/warranty-alerts]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
