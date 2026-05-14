'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PageHeader, DataTable, FilterBar } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePurchases } from '@/hooks/inventory';
import { PurchaseStatusBadge } from '@/components/inventory/purchases/PurchaseStatusBadge';
import type { Purchase, PurchaseStatus } from '@/types';

export default function PurchasesListPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string }>();
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
      header: 'Date',
      sortable: true,
      render: (p) => new Date(p.invoiceDate).toLocaleDateString(),
    },
    { key: 'supplierName', header: 'Supplier', sortable: true, render: (p) => p.supplierName },
    { key: 'invoiceNumber', header: 'Invoice #', render: (p) => p.invoiceNumber || '—' },
    { key: 'lines', header: 'Lines', render: (p) => String(p.lines.length) },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      render: (p) => p.total.toFixed(2),
    },
    { key: 'status', header: 'Status', render: (p) => <PurchaseStatusBadge status={p.status} /> },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Purchases"
        description="Record stock-in from suppliers. Receiving a purchase increases inventory levels."
        breadcrumb={[
          { label: 'Raseed', href: `/${params.locale}/${params.orgSlug}/raseed` },
          { label: 'Purchases', href: '#' },
        ]}
        actions={
          <Button onClick={() => router.push(`/${params.locale}/${params.orgSlug}/raseed/purchases/new`)}>
            <Plus size={16} className="mr-1" /> New purchase
          </Button>
        }
      />

      <FilterBar
        searchPlaceholder="Search supplier or invoice…"
        searchValue={search}
        onSearchChange={setSearch}
        filters={
          <Select value={status} onValueChange={(v) => setStatus(v as PurchaseStatus | 'all')}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable<Purchase>
        columns={columns}
        data={data?.items ?? []}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        emptyMessage="No purchases yet — create one to record your first supplier delivery."
        onRowClick={(p) => router.push(`/${params.locale}/${params.orgSlug}/raseed/purchases/${p.id}`)}
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
