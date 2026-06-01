'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PageHeader, DataTable, FilterBar, StatusBadge, SubscriptionGate } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { useSessions } from '@/hooks/haraka';
import { useOrgInfo } from '@/hooks/org';
import { useT } from '@/hooks/ui';
import type { PosSession } from '@/types';

export default function SessionsListPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const [status, setStatus] = useState<'open' | 'closed' | 'all'>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSessions({
    status: status === 'all' ? undefined : status,
    page,
    pageSize: 20,
  });

  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;

  const columns: ColumnDef<PosSession>[] = [
    {
      key: 'openedAt',
      header: t('haraka.opened'),
      sortable: true,
      render: (s) => (
        <span className="text-sm tabular-nums font-mono text-gray-700">
          {new Date(s.openedAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'cashierName',
      header: t('haraka.cashier'),
      render: (s) => <span className="text-sm text-gray-700">{s.cashierName}</span>,
    },
    {
      key: 'openingFloat',
      header: t('haraka.float'),
      render: (s) => (
        <span className="text-sm tabular-nums font-mono text-gray-700">{s.openingFloat.toFixed(2)}</span>
      ),
    },
    {
      key: 'discrepancy',
      header: t('haraka.discrepancy'),
      render: (s) => {
        if (s.discrepancy == null) return <span className="text-gray-400">—</span>;
        const v = s.discrepancy;
        const colour = v === 0 ? 'text-gray-600' : v > 0 ? 'text-green-700' : 'text-red-700';
        return (
          <span className={`font-mono text-sm tabular-nums ${colour}`}>
            {v >= 0 ? '+' : ''}{v.toFixed(2)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: t('col.status'),
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: 'closedAt',
      header: t('haraka.sessionsClosed'),
      render: (s) => s.closedAt
        ? <span className="text-sm tabular-nums font-mono text-gray-500">{new Date(s.closedAt).toLocaleString()}</span>
        : <span className="text-gray-400">—</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('haraka.sessions')}
        description={t('haraka.sessionsSub')}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: t('nav.pos'), href: base },
          { label: t('haraka.sessions') },
        ]}
        actions={
          <SubscriptionGate>
            <Button
              onClick={() => router.push(`${base}/sessions/new`)}
              style={{ background: 'var(--mod-haraka)' }}
            >
              <Plus size={16} className="me-1" /> {t('haraka.openNewSession')}
            </Button>
          </SubscriptionGate>
        }
      />

      <FilterBar
        filters={
          <ConfigSelect
            listKey="pos_session_status"
            value={status}
            onValueChange={(v) => setStatus(v as 'open' | 'closed' | 'all')}
            includeAll
            allLabel={t('assets.filterAll')}
            className="w-36"
          />
        }
      />

      <DataTable<PosSession>
        columns={columns}
        data={data?.items ?? []}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
        emptyMessage={t('haraka.noSessions')}
        onRowClick={(s) => router.push(`${base}/sessions/${s.id}`)}
        pagination={
          data
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
