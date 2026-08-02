import { NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { hasSuperAdminPermission } from '@/lib/permissions/superadmin';
import { getOrganizationsWithSearch } from '@/lib/db/organizations';
import { getSubscriptionsByOrgs } from '@/lib/db/subscriptions';
import { getPackagesByIds } from '@/lib/db/packages';
import { getOpenInvoices } from '@/lib/db/invoices';
import { computeInvoice } from '@/lib/billing/compute-invoice';

export async function GET() {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasSuperAdminPermission(user, 'organizations', 'view'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orgs = await getOrganizationsWithSearch({});
    const orgIds = orgs.map((o) => o.id);
    const [subs, openInvoices] = await Promise.all([
      getSubscriptionsByOrgs(orgIds),
      getOpenInvoices(),
    ]);

    const pkgIds = [...new Set(subs.map((s) => s.packageId).filter((x): x is string => !!x))];
    const packages = await getPackagesByIds(pkgIds);
    const pkgById = new Map(packages.map((p) => [p.id, p]));
    const orgById = new Map(orgs.map((o) => [o.id, o]));
    const now = new Date();

    const statusCounts: Record<string, number> = {};
    let mrr = 0;
    let currency = 'JOD';

    const rows = subs.map((s) => {
      statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;
      const pkg = s.packageId ? pkgById.get(s.packageId) : null;
      const monthly = pkg ? computeInvoice(s, pkg, now).total : 0;
      if (pkg) currency = pkg.pricing.currency;
      // MRR counts orgs still being billed (active or in grace).
      if (s.status === 'ACTIVE' || s.status === 'GRACE') mrr += monthly;
      const daysToRenewal = Math.ceil((new Date(s.endDate).getTime() - now.getTime()) / 86400000);
      return {
        organizationId: s.organizationId,
        organizationName: orgById.get(s.organizationId)?.name ?? '—',
        plan: pkg?.name ?? null,
        status: s.status,
        monthlyTotal: monthly,
        currency: pkg?.pricing.currency ?? currency,
        endDate: s.endDate,
        daysToRenewal,
      };
    });

    const openInvoiceRows = openInvoices.map((i) => ({
      id: i.id,
      organizationId: i.organizationId,
      organizationName: orgById.get(i.organizationId)?.name ?? '—',
      total: i.total,
      currency: i.currency,
      status: i.status,
      dueDate: i.dueDate,
      graceDeadline: i.graceDeadline,
      pastGrace: new Date(i.graceDeadline) < now,
    }));

    return NextResponse.json(
      {
        mrr: Math.round(mrr * 100) / 100,
        currency,
        statusCounts,
        orgCount: subs.length,
        rows: rows.sort((a, b) => a.daysToRenewal - b.daysToRenewal),
        openInvoices: openInvoiceRows,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[GET /api/superadmin/billing]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
