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
import type { Purchase, PurchaseStatus } from '@/types';

export default function PurchasesListPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { t } = useT();
  const [status, setStatus] = useState<PurchaseStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePurchases({
    status: status === 'all' ? undefined : status,
    search: search || undefined,
    page,
    pageSize: 20,
  });

  const columns: ColumnDef<Purchase>[] = [
    {
      key: 'invoiceDate',
      header: t('col.date'),
      sortable: true,
      render: (p) => new Date(p.invoiceDate).toLocaleDateString(),
    },
    { key: 'supplierName', header: t('col.supplier'), sortable: true, render: (p) => p.supplierName },
    { key: 'invoiceNumber', header: t('col.invoiceNumber'), render: (p) => p.invoiceNumber || '—' },
    { key: 'lines', header: t('col.lines'), render: (p) => String(p.lines.length) },
    {
      key: 'total',
      header: t('col.total'),
      sortable: true,
      render: (p) => p.total.toFixed(2),
    },
    { key: 'status', header: t('col.status'), render: (p) => <PurchaseStatusBadge status={p.status} /> },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t('nav.purchases')}
        description={t('purchases.subtitle')}
        breadcrumb={[
          { label: t('nav.inventory'), href: `/${params.locale}/${params.orgSlug}/${params.space}/raseed` },
          { label: t('nav.purchases'), href: '#' },
        ]}
        actions={
          <Button onClick={() => router.push(`/${params.locale}/${params.orgSlug}/${params.space}/raseed/purchases/new`)}>
            <Plus size={16} className="me-1" /> {t('purchases.newPurchase')}
          </Button>
        }
      />

      <FilterBar
        searchPlaceholder={t('purchases.searchPlaceholder')}
        searchValue={search}
        onSearchChange={setSearch}
        filters={
          <ConfigSelect listKey="purchase_status" value={status} onValueChange={(v) => setStatus(v as PurchaseStatus | 'all')} includeAll allLabel={t('requests.allStatuses')} className="w-40" />
        }
      />

      <DataTable<Purchase>
        columns={columns}
        data={data?.items ?? []}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        emptyMessage={t('purchases.noPurchases')}
        onRowClick={(p) => router.push(`/${params.locale}/${params.orgSlug}/${params.space}/raseed/purchases/${p.id}`)}
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
