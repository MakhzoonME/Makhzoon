'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PageHeader, DataTable, FilterBar } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { OrderStatusBadge } from '@/components/haraka/OrderStatusBadge';
import { useOrders } from '@/hooks/haraka';
import { useAdminGuard, useModuleGuard } from '@/hooks/ui';
import { formatCurrency } from '@/lib/utils/format';
import { formatDate } from '@/lib/utils/date';
import { useOrgInfo } from '@/hooks/org';
import type { HarakaOrder } from '@/types';

export default function OrdersListPage() {
  const { isAllowed: featureAllowed } = useModuleGuard({ featureKey: 'pos', moduleKey: 'pos' });
  const { isAllowed } = useAdminGuard('pos.view_orders');
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { data: orgInfo } = useOrgInfo();
  if (!featureAllowed || !isAllowed) return null;

  const [status, setStatus]   = useState('all');
  const [channel, setChannel] = useState('all');
  const [page, setPage]       = useState(1);

  const { data, isLoading } = useOrders({
    status:   status  === 'all' ? undefined : status,
    channel:  channel === 'all' ? undefined : channel,
    page,
    pageSize: 25,
  });

  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;
  const currency = orgInfo?.currency ?? 'USD';

  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const columns: ColumnDef<HarakaOrder>[] = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (o) => (
        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--mod-haraka)' }}>
          {o.orderNumber}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (o) => (
        <div className="text-sm">
          <div className="font-medium text-gray-800">{o.customerName}</div>
          {o.customerPhone && <div className="text-gray-400 text-xs">{o.customerPhone}</div>}
        </div>
      ),
    },
    {
      key: 'channel',
      header: 'Channel',
      render: (o) => (
        <span className="text-sm capitalize text-gray-600">{o.channel.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      key: 'fulfillmentType',
      header: 'Fulfillment',
      render: (o) => (
        <span className="text-xs text-gray-500 capitalize">{o.fulfillmentType}</span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (o) => (
        <span className="font-mono text-sm tabular-nums">{formatCurrency(o.total, currency)}</span>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (o) => {
        const color =
          o.paymentStatus === 'paid'    ? '#22c55e'
          : o.paymentStatus === 'partial' ? '#f97316'
          : '#9ca3af';
        return (
          <span className="text-xs font-medium capitalize" style={{ color }}>
            {o.paymentStatus}
          </span>
        );
      },
    },
    {
      key: 'salesAgentName',
      header: 'Sales agent',
      render: (o) => <span className="text-sm text-gray-600">{o.salesAgentName}</span>,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (o) => <span className="text-xs text-gray-400">{formatDate(o.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Orders received via phone, WhatsApp, and social media."
        actions={
          <Button onClick={() => router.push(`${base}/orders/new`)} style={{ background: 'var(--mod-haraka)' }}>
            <Plus className="h-4 w-4 mr-2" /> New Order
          </Button>
        }
      />

      <FilterBar
        filters={[
          <ConfigSelect
            key="status"
            listKey="order_status"
            value={status}
            onValueChange={(v) => { setStatus(v); setPage(1); }}
            includeAll
            allLabel="All statuses"
            allValue="all"
            className="w-44"
          />,
          <ConfigSelect
            key="channel"
            listKey="order_channel"
            value={channel}
            onValueChange={(v) => { setChannel(v); setPage(1); }}
            includeAll
            allLabel="All channels"
            allValue="all"
            className="w-40"
          />,
        ]}
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage="No orders yet."
        onRowClick={(o) => router.push(`${base}/orders/${o.id}`)}
        pagination={
          data && data.totalPages > 1
            ? { page: data.page, pageSize: data.pageSize, total: data.total, totalPages: data.totalPages, onPageChange: setPage }
            : undefined
        }
      />
    </div>
  );
}
