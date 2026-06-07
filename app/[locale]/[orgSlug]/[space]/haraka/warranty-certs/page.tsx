'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { PageHeader, DataTable } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { WarrantyCertShareDialog } from '@/components/haraka/WarrantyCertShareDialog';
import { useWarrantyCerts, useWarrantyConfig } from '@/hooks/haraka';
import { useAdminGuard, useModuleGuard } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { formatDate } from '@/lib/utils/date';
import { getReceiptBaseUrl } from '@/lib/app-env';
import type { HarakaWarrantyCert } from '@/types';

export default function WarrantyCertsPage() {
  const { isAllowed: featureAllowed } = useModuleGuard({ featureKey: 'pos', moduleKey: 'pos' });
  const { isAllowed } = useAdminGuard('pos.view_warranty_certs');
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { data: orgInfo } = useOrgInfo();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<HarakaWarrantyCert | null>(null);

  const { data, isLoading } = useWarrantyCerts({ page, pageSize: 25 });
  const { data: cfgData }    = useWarrantyConfig();

  const config      = cfgData?.config;
  const certBaseUrl = getReceiptBaseUrl();

  if (!featureAllowed || !isAllowed) {
    return null;
  }

  const columns: ColumnDef<HarakaWarrantyCert>[] = [
    {
      key: 'warrantyNumber',
      header: 'Certificate',
      render: (c) => (
        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--mod-haraka)' }}>
          {c.warrantyNumber}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (c) => (
        <div className="text-sm">
          <div className="font-medium text-gray-800">{c.customerName}</div>
          {c.customerPhone && <div className="text-xs text-gray-400">{c.customerPhone}</div>}
        </div>
      ),
    },
    {
      key: 'sourceType',
      header: 'Source',
      render: (c) => (
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: c.sourceType === 'order' ? '#6366f110' : '#f9731610', color: c.sourceType === 'order' ? '#6366f1' : '#f97316' }}>
          {c.sourceType === 'order' ? 'Order' : 'POS'}
        </span>
      ),
    },
    {
      key: 'items' as keyof HarakaWarrantyCert,
      header: 'Items',
      render: (c) => <span className="text-sm text-gray-500">{c.items.length}</span>,
    },
    {
      key: 'warrantyStartDate',
      header: 'Period',
      render: (c) => (
        <span className="text-xs text-gray-500 tabular-nums">
          {c.warrantyStartDate} → {c.warrantyEndDate}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Issued',
      render: (c) => <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warranty Certificates"
        description="Customer-facing warranty documents generated from orders and sales."
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage="No warranty certificates yet."
        onRowClick={(c) => setSelected(c)}
        pagination={
          data && data.totalPages > 1
            ? { page: data.page, pageSize: data.pageSize, total: data.total, totalPages: data.totalPages, onPageChange: setPage }
            : undefined
        }
      />

      {selected && config && (
        <WarrantyCertShareDialog
          open={!!selected}
          onOpenChange={(o) => { if (!o) setSelected(null); }}
          cert={selected}
          orgSlug={params.orgSlug}
          orgName={orgInfo?.name ?? params.orgSlug}
          config={config}
          certBaseUrl={certBaseUrl}
        />
      )}
    </div>
  );
}
