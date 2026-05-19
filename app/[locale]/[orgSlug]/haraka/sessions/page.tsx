'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PageHeader, DataTable, FilterBar, StatusBadge, SubscriptionGate } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSessions } from '@/hooks/haraka';
import type { PosSession } from '@/types';

export default function SessionsListPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string }>();
  const [status, setStatus] = useState<'open' | 'closed' | 'all'>('all');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSessions({
    status: status === 'all' ? undefined : status,
    page,
    pageSize: 20,
  });

  const columns: ColumnDef<PosSession>[] = [
    { key: 'openedAt', header: 'Opened', sortable: true, render: (s) => new Date(s.openedAt).toLocaleString() },
    { key: 'cashierName', header: 'Cashier', render: (s) => s.cashierName },
    { key: 'openingFloat', header: 'Float', render: (s) => s.openingFloat.toFixed(2) },
    {
      key: 'discrepancy',
      header: 'Discrepancy',
      render: (s) => {
        if (s.discrepancy == null) return '—';
        const v = s.discrepancy;
        const colour = v === 0 ? 'text-gray-600' : v > 0 ? 'text-green-700' : 'text-red-700';
        return <span className={`font-mono ${colour}`}>{v >= 0 ? '+' : ''}{v.toFixed(2)}</span>;
      },
    },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    {
      key: 'closedAt',
      header: 'Closed',
      render: (s) => (s.closedAt ? new Date(s.closedAt).toLocaleString() : '—'),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="POS sessions"
        description="History of cash-drawer sessions. Open a new one to start selling."
        breadcrumb={[
          { label: 'Haraka', href: `/${params.locale}/${params.orgSlug}/haraka` },
          { label: 'Sessions', href: '#' },
        ]}
        actions={
          <SubscriptionGate>
            <Button onClick={() => router.push(`/${params.locale}/${params.orgSlug}/haraka/sessions/new`)}>
              <Plus size={16} className="mr-1" /> Open session
            </Button>
          </SubscriptionGate>
        }
      />

      <FilterBar
        filters={
          <Select value={status} onValueChange={(v) => setStatus(v as 'open' | 'closed' | 'all')}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable<PosSession>
        columns={columns}
        data={data?.items ?? []}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
        emptyMessage="No sessions yet."
        onRowClick={(s) => router.push(`/${params.locale}/${params.orgSlug}/haraka/sessions/${s.id}`)}
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
