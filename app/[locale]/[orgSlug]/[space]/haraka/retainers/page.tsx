'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PageHeader, DataTable, FilterBar } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { RetainerStatusBadge } from '@/components/haraka/RetainerStatusBadge';
import { useRetainers } from '@/hooks/haraka';
import { useAdminGuard, useModuleGuard, useT } from '@/hooks/ui';
import { formatCurrency } from '@/lib/utils/format';
import { useOrgInfo } from '@/hooks/org';
import type { HarakaRetainer } from '@/types';

export default function RetainersListPage() {
  const { isAllowed: featureAllowed } = useModuleGuard({ featureKey: 'pos', moduleKey: 'pos' });
  const { isAllowed } = useAdminGuard('pos.view_retainers');
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { data: orgInfo } = useOrgInfo();
  const { t } = useT();

  const [status, setStatus] = useState('all');
  const [page,   setPage]   = useState(1);

  const { data, isLoading } = useRetainers({
    status:   status === 'all' ? undefined : status,
    page,
    pageSize: 25,
  });

  if (!featureAllowed || !isAllowed) return null;

  const base     = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;
  const currency = orgInfo?.currency ?? 'USD';

  const columns: ColumnDef<HarakaRetainer>[] = [
    {
      key: 'retainerNumber',
      header: '#',
      render: (r) => (
        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--mod-haraka)' }}>
          {r.retainerNumber}
        </span>
      ),
    },
    {
      key: 'name',
      header: t('col.name'),
      render: (r) => <span className="text-sm font-medium text-gray-800">{r.name}</span>,
    },
    {
      key: 'customerName',
      header: t('col.client'),
      render: (r) => (
        <div className="text-sm">
          <div className="font-medium text-gray-800">{r.customerName}</div>
          {r.customerPhone && <div className="text-gray-400 text-xs">{r.customerPhone}</div>}
        </div>
      ),
    },
    {
      key: 'billingCycle',
      header: t('col.cycle'),
      render: (r) => <span className="text-xs text-gray-500 capitalize">{r.billingCycle}</span>,
    },
    {
      key: 'amountPerCycle',
      header: t('col.amountPerCycle'),
      render: (r) => <span className="font-mono text-sm tabular-nums">{formatCurrency(r.amountPerCycle, currency)}</span>,
    },
    {
      key: 'status',
      header: t('col.status'),
      render: (r) => <RetainerStatusBadge status={r.status} />,
    },
    {
      key: 'nextBillingDate',
      header: t('col.nextBilling'),
      render: (r) => <span className="text-xs text-gray-500">{r.nextBillingDate ?? '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('retainers.title')}
        description={t('retainers.subtitle')}
        actions={
          <Button onClick={() => router.push(`${base}/retainers/new`)} style={{ background: 'var(--mod-haraka)' }}>
            <Plus className="h-4 w-4 me-2" /> {t('retainers.newRetainer')}
          </Button>
        }
      />

      <FilterBar
        filters={[
          <ConfigSelect
            key="status"
            listKey="retainer_status"
            value={status}
            onValueChange={(v) => { setStatus(v); setPage(1); }}
            includeAll
            allLabel={t('common.selectPlaceholder')}
            allValue="all"
            className="w-44"
          />,
        ]}
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage={t('retainers.noRetainers')}
        onRowClick={(r) => router.push(`${base}/retainers/${r.id}`)}
        pagination={
          data && data.totalPages > 1
            ? { page: data.page, pageSize: data.pageSize, total: data.total, totalPages: data.totalPages, onPageChange: setPage }
            : undefined
        }
      />
    </div>
  );
}
