'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PageHeader, DataTable, FilterBar } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { ServiceJobStatusBadge } from '@/components/haraka/ServiceJobStatusBadge';
import { useServiceJobs } from '@/hooks/haraka';
import { useAdminGuard, useModuleGuard, useT } from '@/hooks/ui';
import { formatCurrency } from '@/lib/utils/format';
import { formatDate } from '@/lib/utils/date';
import { useOrgInfo } from '@/hooks/org';
import type { HarakaServiceJob } from '@/types';

export default function ServiceJobsListPage() {
  const { isAllowed: featureAllowed } = useModuleGuard({ featureKey: 'pos', moduleKey: 'pos' });
  const { isAllowed } = useAdminGuard('pos.view_service_jobs');
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { data: orgInfo } = useOrgInfo();
  const { t } = useT();
  if (!featureAllowed || !isAllowed) return null;

  const [status,      setStatus]      = useState('all');
  const [serviceType, setServiceType] = useState('all');
  const [page,        setPage]        = useState(1);

  const { data, isLoading } = useServiceJobs({
    status:      status      === 'all' ? undefined : status,
    serviceType: serviceType === 'all' ? undefined : serviceType,
    page,
    pageSize: 25,
  });

  const base     = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;
  const currency = orgInfo?.currency ?? 'USD';

  const columns: ColumnDef<HarakaServiceJob>[] = [
    {
      key: 'jobNumber',
      header: t('col.job'),
      render: (j) => (
        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--mod-haraka)' }}>
          {j.jobNumber}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: t('col.customer'),
      render: (j) => (
        <div className="text-sm">
          <div className="font-medium text-gray-800">{j.customerName}</div>
          {j.customerPhone && <div className="text-gray-400 text-xs">{j.customerPhone}</div>}
        </div>
      ),
    },
    {
      key: 'serviceType',
      header: t('col.serviceType'),
      render: (j) => (
        <span className="text-xs text-gray-500 capitalize">{j.serviceType?.replace(/_/g, ' ') ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: t('col.status'),
      render: (j) => <ServiceJobStatusBadge status={j.status} />,
    },
    {
      key: 'staffMemberName',
      header: t('col.assignedTo'),
      render: (j) => <span className="text-sm text-gray-600">{j.staffMemberName ?? '—'}</span>,
    },
    {
      key: 'total',
      header: t('col.total'),
      render: (j) => <span className="font-mono text-sm tabular-nums">{formatCurrency(j.total, currency)}</span>,
    },
    {
      key: 'paymentStatus',
      header: t('col.payment'),
      render: (j) => {
        const color =
          j.paymentStatus === 'paid'    ? '#22c55e'
          : j.paymentStatus === 'partial' ? '#f97316'
          : '#9ca3af';
        return <span className="text-xs font-medium capitalize" style={{ color }}>{j.paymentStatus}</span>;
      },
    },
    {
      key: 'createdAt',
      header: t('col.date'),
      render: (j) => <span className="text-xs text-gray-400">{formatDate(j.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('serviceJobs.title')}
        description={t('serviceJobs.subtitle')}
        actions={
          <Button onClick={() => router.push(`${base}/service-jobs/new`)} style={{ background: 'var(--mod-haraka)' }}>
            <Plus className="h-4 w-4 me-2" /> {t('serviceJobs.newJob')}
          </Button>
        }
      />

      <FilterBar
        filters={[
          <ConfigSelect
            key="status"
            listKey="service_job_status"
            value={status}
            onValueChange={(v) => { setStatus(v); setPage(1); }}
            includeAll
            allLabel={t('common.selectPlaceholder')}
            allValue="all"
            className="w-44"
          />,
          <ConfigSelect
            key="type"
            listKey="service_job_type"
            value={serviceType}
            onValueChange={(v) => { setServiceType(v); setPage(1); }}
            includeAll
            allLabel={t('common.selectPlaceholder')}
            allValue="all"
            className="w-40"
          />,
        ]}
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage={t('serviceJobs.noJobs')}
        onRowClick={(j) => router.push(`${base}/service-jobs/${j.id}`)}
        pagination={
          data && data.totalPages > 1
            ? { page: data.page, pageSize: data.pageSize, total: data.total, totalPages: data.totalPages, onPageChange: setPage }
            : undefined
        }
      />
    </div>
  );
}
