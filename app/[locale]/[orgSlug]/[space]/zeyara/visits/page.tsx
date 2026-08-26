'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, FilterBar } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { VerticalProvider, useVertical } from '@/components/vertical/VerticalProvider';
import { useVisits } from '@/hooks/zeyara';
import { useModuleGuard, useT } from '@/hooks/ui';
import { formatDateTime, formatDate } from '@/lib/utils/date';
import type { ZeyaraVisit } from '@/types';

function VisitsList() {
  const { featureKey, permModule, basePath, colorVar } = useVertical();
  const { isAllowed } = useModuleGuard({ featureKey, moduleKey: permModule, permOp: 'visitsView' });
  const router = useRouter();
  const { t } = useT();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useVisits({ search: search || undefined, page, pageSize: 25 });

  if (!isAllowed) return null;

  const columns: ColumnDef<ZeyaraVisit>[] = [
    {
      key: 'visitNumber',
      header: t('zeyara.colVisit'),
      render: (v) => (
        <span className="font-mono text-xs font-semibold" style={{ color: colorVar }}>
          {v.visitNumber}
        </span>
      ),
    },
    {
      key: 'visitDate',
      header: t('zeyara.colVisitDate'),
      render: (v) => <span className="text-sm text-gray-800">{formatDateTime(v.visitDate)}</span>,
    },
    {
      key: 'patientName',
      header: t('zeyara.colPatient'),
      render: (v) => <span className="text-sm font-medium text-gray-800">{v.patientName}</span>,
    },
    {
      key: 'providerName',
      header: t('appointments.labelProvider'),
      render: (v) => <span className="text-sm text-gray-600">{v.providerName ?? '—'}</span>,
    },
    {
      key: 'diagnosis',
      header: t('zeyara.diagnosis'),
      render: (v) => (
        <span className="block max-w-[22rem] truncate text-sm text-gray-600">
          {v.diagnosis ?? '—'}
        </span>
      ),
    },
    {
      key: 'followUpDue',
      header: t('zeyara.followUpDue'),
      render: (v) =>
        v.followUpDue
          ? <span className="text-sm text-gray-600">{formatDate(new Date(`${v.followUpDue}T00:00:00`))}</span>
          : <span className="text-gray-300 text-xs">—</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('zeyara.visitsTitle')} description={t('zeyara.visitsSubtitle')} />

      <FilterBar
        searchPlaceholder={t('zeyara.visitsSearchPlaceholder')}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
      />

      <DataTable<ZeyaraVisit>
        columns={columns}
        data={data?.items ?? []}
        keyExtractor={(v) => v.id}
        isLoading={isLoading}
        emptyMessage={t('zeyara.noVisits')}
        // The record is edited in context on its appointment, so there is one
        // place a visit is written — not two that can disagree.
        onRowClick={(v) => router.push(`${basePath}/appointments/${v.appointmentId}`)}
        pagination={
          data && data.totalPages > 1
            ? {
                page: data.page,
                pageSize: data.pageSize,
                total: data.total,
                totalPages: data.totalPages,
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </div>
  );
}

export default function ZeyaraVisitsPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <VisitsList />
    </VerticalProvider>
  );
}
