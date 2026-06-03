'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, ArrowRight, Lock } from 'lucide-react';
import { PageHeader, DataTable, FilterBar, StatusBadge, SubscriptionGate } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { useSessions, useCurrentSession } from '@/hooks/haraka';
import { useOrgInfo } from '@/hooks/org';
import { useT } from '@/hooks/ui';
import { formatDate } from '@/lib/utils/date';
import { formatCurrency } from '@/lib/utils/format';
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
  const { data: currentData, isLoading: currentLoading } = useCurrentSession();

  const columns: ColumnDef<PosSession>[] = [
    {
      key: 'id',
      header: 'Session',
      render: (s) => (
        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--mod-haraka)' }}>
          #{s.id.slice(0, 8)}
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
        <span className="text-sm tabular-nums font-mono">{s.openingFloat.toFixed(2)}</span>
      ),
    },
    {
      key: 'discrepancy',
      header: t('haraka.discrepancy'),
      render: (s) => {
        if (s.discrepancy == null) return <span className="text-gray-400">—</span>;
        const v = s.discrepancy;
        return (
          <span
            className="font-mono text-sm tabular-nums font-semibold"
            style={{ color: v === 0 ? 'var(--text-secondary)' : v > 0 ? 'var(--green-700)' : 'var(--red-700)' }}
          >
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
      key: 'openedAt',
      header: t('haraka.opened'),
      sortable: true,
      render: (s) => (
        <span className="text-sm tabular-nums font-mono text-gray-500">
          {new Date(s.openedAt).toLocaleString()}
        </span>
      ),
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
    <div className="space-y-6">
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

      {/* Active session highlight card */}
      {!currentLoading && currentData?.session && (
        <Card className="mb-4 border-[var(--green-100)] bg-[var(--green-50)]">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--green-700)] animate-pulse" />
                <span className="text-sm font-semibold text-[var(--green-700)]">{t('haraka.activeSession')}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {t('haraka.openedBy').replace('{name}', currentData.session.cashierName)}
                {' · '}{formatDate(currentData.session.openedAt)}
                {' · '}{formatCurrency(currentData.session.openingFloat)}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`${base}/sessions/${currentData.session!.id}`)}
              >
                <Lock size={14} className="me-1" /> {t('register.closeSession')}
              </Button>
              <Button
                size="sm"
                style={{ background: 'var(--mod-haraka)' }}
                onClick={() => router.push(`${base}/register`)}
              >
                {t('haraka.openRegister')} <ArrowRight className="h-4 w-4 ms-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
