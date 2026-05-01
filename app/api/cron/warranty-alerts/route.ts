import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { sendEmail } from '@/lib/email/resend';
import { warrantyAlertEmail } from '@/lib/email/templates';
import { queueAuditLog } from '@/lib/audit/logger';

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

    const snap = await adminDb.collection('warranties')
      .where('endDate', '>=', pastWindow)
      .where('endDate', '<=', windowEnd)
      .get();

    const byOrg = new Map<string, WarrantyDoc[]>();
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.reminder === false) return;
      const endDate = data.endDate instanceof Timestamp ? data.endDate.toDate() : new Date(data.endDate);
      const w: WarrantyDoc = {
        id: d.id,
        organizationId: data.organizationId,
        assetId: data.assetId,
        vendor: data.vendor ?? 'Unknown vendor',
        endDate,
        reminder: data.reminder,
      };
      const list = byOrg.get(w.organizationId) ?? [];
      list.push(w);
      byOrg.set(w.organizationId, list);
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? req.nextUrl.origin;
    const results: { orgId: string; admins: number; items: number; sent: number; skipped: boolean }[] = [];

    const entries: [string, WarrantyDoc[]][] = [];
    byOrg.forEach((v, k) => entries.push([k, v]));

    for (const [orgId, warranties] of entries) {
      const [orgDoc, adminsSnap] = await Promise.all([
        adminDb.collection('organizations').doc(orgId).get(),
        adminDb.collection('users').where('organizationId', '==', orgId).where('role', '==', 'admin').get(),
      ]);

      if (!orgDoc.exists || adminsSnap.empty) {
        results.push({ orgId, admins: adminsSnap.size, items: warranties.length, sent: 0, skipped: true });
        continue;
      }

      const orgName = (orgDoc.data()?.name as string) ?? 'Your organization';
      const assetIds: string[] = Array.from(new Set(warranties.map((w: WarrantyDoc) => w.assetId)));
      const assetNames = new Map<string, string>();

      for (let i = 0; i < assetIds.length; i += 10) {
        const chunk = assetIds.slice(i, i + 10);
        const refs = chunk.map((id) => adminDb.collection('assets').doc(id));
        const docs = await adminDb.getAll(...refs);
        docs.forEach((doc, idx) => {
          if (doc.exists) assetNames.set(chunk[idx], (doc.data()?.name as string) ?? 'Asset');
        });
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
      const recipients = adminsSnap.docs.map((d) => d.data().email as string).filter(Boolean);

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

      results.push({ orgId, admins: adminsSnap.size, items: items.length, sent, skipped: false });
    }

    return NextResponse.json({ ok: true, orgs: results.length, results });
  } catch (err) {
    console.error('[GET /api/cron/warranty-alerts]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
