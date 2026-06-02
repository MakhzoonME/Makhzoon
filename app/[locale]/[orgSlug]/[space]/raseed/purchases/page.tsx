'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PageHeader, DataTable, FilterBar } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { usePurchases } from '@/hooks/inventory';
import { PurchaseStatusBadge } from '@/components/inventory/purchases/PurchaseStatusBadge';
import { useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import type { Purchase, PurchaseStatus } from '@/types';

export default function PurchasesListPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const [status, setStatus] = useState<PurchaseStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const base = `/${params.locale}/${params.orgSlug}/${params.space}/raseed/purchases`;

  const { data, isLoading } = usePurchases({
    status: status === 'all' ? undefined : status,
    search: search || undefined,
    page,
    pageSize: 20,
  });

  const columns: ColumnDef<Purchase>[] = [
    {
      key: 'supplierName',
      header: t('col.supplier'),
      sortable: true,
      render: (p) => (
        <button
          className="font-medium text-primary-600 hover:text-primary-700 hover:underline text-start cursor-pointer transition-colors duration-150"
          onClick={() => router.push(`${base}/${p.id}`)}
        >
          {p.supplierName}
        </button>
      ),
    },
    {
      key: 'invoiceNumber',
      header: t('col.invoiceNumber'),
      render: (p) => p.invoiceNumber
        ? <span className="font-mono text-xs text-gray-600">{p.invoiceNumber}</span>
        : <span className="text-gray-400">—</span>,
    },
    {
      key: 'invoiceDate',
      header: t('col.invoiceDate'),
      sortable: true,
      render: (p) => (
        <span className="text-sm text-gray-600 tabular-nums font-mono">
          {new Date(p.invoiceDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'total',
      header: t('col.total'),
      sortable: true,
      render: (p) => (
        <span className="font-mono font-semibold tabular-nums text-sm">
          JOD {p.total.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('col.status'),
      render: (p) => <PurchaseStatusBadge status={p.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('nav.purchases')}
        description={t('purchases.subtitle')}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: t('nav.inventory'), href: `/${params.locale}/${params.orgSlug}/${params.space}/raseed/list` },
          { label: t('nav.purchases') },
        ]}
        actions={
          <Button
            size="sm"
            onClick={() => router.push(`${base}/new`)}
          >
            <Plus aria-hidden size={16} className="me-1" /> {t('purchases.newPurchase')}
          </Button>
        }
      />

      <FilterBar
        searchPlaceholder={t('purchases.searchPlaceholder')}
        searchValue={search}
        onSearchChange={setSearch}
        filters={
          <ConfigSelect
            listKey="purchase_status"
            value={status}
            onValueChange={(v) => setStatus(v as PurchaseStatus | 'all')}
            includeAll
            allLabel={t('requests.allStatuses')}
            className="w-40"
          />
        }
      />

      <DataTable<Purchase>
        columns={columns}
        data={data?.items ?? []}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        emptyMessage={t('purchases.noPurchases')}
        onRowClick={(p) => router.push(`${base}/${p.id}`)}
        pagination={
          data ? {
            page: data.page,
            pageSize: data.pageSize,
            total: data.total,
            totalPages: data.totalPages,
            onPageChange: setPage,
          } : undefined
        }
      />
    </div>
  );
}
