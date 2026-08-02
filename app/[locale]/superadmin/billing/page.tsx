'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { useT } from '@/hooks/ui';
import { formatDate } from '@/lib/utils/date';

interface OrgRow {
  organizationId: string;
  organizationName: string;
  plan: string | null;
  status: string;
  monthlyTotal: number;
  currency: string;
  endDate: string;
  daysToRenewal: number;
}
interface OpenInvoiceRow {
  id: string;
  organizationId: string;
  organizationName: string;
  total: number;
  currency: string;
  status: string;
  dueDate: string;
  graceDeadline: string;
  pastGrace: boolean;
}
interface BillingData {
  mrr: number;
  currency: string;
  statusCounts: Record<string, number>;
  orgCount: number;
  rows: OrgRow[];
  openInvoices: OpenInvoiceRow[];
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
        <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function SuperadminBillingPage() {
  const { t, locale } = useT();
  const router = useRouter();

  const { data, isLoading } = useQuery<BillingData>({
    queryKey: ['superadmin-billing'],
    queryFn: async () => {
      const res = await fetch('/api/superadmin/billing');
      if (!res.ok) throw new Error('Failed to load billing');
      return res.json();
    },
  });

  const money = (n: number, c: string) => `${n.toFixed(2)} ${c}`;
  const openToOrg = (orgId: string) =>
    router.push(`/${locale}/superadmin/organizations/${orgId}/subscription`);

  const orgColumns: ColumnDef<OrgRow>[] = [
    { key: 'organizationName', header: t('nav.organizations'), render: (r) => r.organizationName },
    { key: 'plan', header: t('nav.packages'), render: (r) => r.plan ?? '—' },
    { key: 'status', header: t('subscription.status'), render: (r) => <span className="text-xs font-medium">{r.status.replace(/_/g, ' ')}</span> },
    { key: 'monthlyTotal', header: 'MRR', render: (r) => money(r.monthlyTotal, r.currency) },
    {
      key: 'endDate',
      header: t('col.end'),
      render: (r) => (
        <span className={r.daysToRenewal < 0 ? 'text-red-600' : r.daysToRenewal <= 30 ? 'text-amber-600' : ''}>
          {formatDate(new Date(r.endDate))} ({r.daysToRenewal < 0 ? `${Math.abs(r.daysToRenewal)}d ago` : `${r.daysToRenewal}d`})
        </span>
      ),
    },
  ];

  const invoiceColumns: ColumnDef<OpenInvoiceRow>[] = [
    { key: 'organizationName', header: t('nav.organizations'), render: (r) => r.organizationName },
    { key: 'total', header: t('subscription.price'), render: (r) => money(r.total, r.currency) },
    { key: 'status', header: t('subscription.status'), render: (r) => <span className="text-xs font-medium">{r.status.replace(/_/g, ' ')}</span> },
    {
      key: 'graceDeadline',
      header: 'Grace ends',
      render: (r) => <span className={r.pastGrace ? 'text-red-600' : ''}>{formatDate(new Date(r.graceDeadline))}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        breadcrumb={[{ label: t('nav.organizations'), href: `/${locale}/superadmin` }, { label: 'Billing' }]}
      />

      {isLoading && <p className="text-sm text-gray-500">{t('common.loading')}</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="MRR" value={money(data.mrr, data.currency)} />
            <Stat label="Active" value={String(data.statusCounts.ACTIVE ?? 0)} />
            <Stat label="In grace" value={String(data.statusCounts.GRACE ?? 0)} />
            <Stat label="Read-only / expired" value={String((data.statusCounts.READ_ONLY ?? 0) + (data.statusCounts.EXPIRED ?? 0))} />
          </div>

          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Open invoices</h3>
              <DataTable
                data={data.openInvoices}
                columns={invoiceColumns}
                emptyMessage="No open invoices."
                keyExtractor={(r) => r.id}
                onRowClick={(r) => openToOrg(r.organizationId)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Organizations by renewal</h3>
              <DataTable
                data={data.rows}
                columns={orgColumns}
                emptyMessage="No subscriptions."
                keyExtractor={(r) => r.organizationId}
                onRowClick={(r) => openToOrg(r.organizationId)}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
