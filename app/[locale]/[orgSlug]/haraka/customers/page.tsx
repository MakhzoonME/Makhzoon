'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, DataTable, FilterBar, ConfirmDialog } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { useCustomers, useDeleteCustomer } from '@/hooks/haraka';
import { toast } from '@/hooks/ui';
import type { PosCustomer } from '@/types';

export default function CustomersListPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string }>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCustomers({ search: search || undefined, page, pageSize: 20 });
  const deleteMut = useDeleteCustomer();
  const [confirmDelete, setConfirmDelete] = useState<PosCustomer | null>(null);

  const base = `/${params.locale}/${params.orgSlug}/haraka/customers`;

  async function onDelete() {
    if (!confirmDelete) return;
    try {
      await deleteMut.mutateAsync(confirmDelete.id);
      toast.success('Customer deleted');
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const columns: ColumnDef<PosCustomer>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (c) => c.name },
    { key: 'phone', header: 'Phone', render: (c) => c.phone ?? '—' },
    { key: 'email', header: 'Email', render: (c) => c.email ?? '—' },
    { key: 'taxNumber', header: 'Tax #', render: (c) => c.taxNumber ?? '—' },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div className="flex gap-1 justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`${base}/${c.id}/edit`);
            }}
            aria-label="Edit"
          >
            <Pencil size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(c);
            }}
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Customers"
        description="Per-organization address book used to attach a customer to a sale."
        breadcrumb={[
          { label: 'Haraka', href: `/${params.locale}/${params.orgSlug}/haraka` },
          { label: 'Customers', href: '#' },
        ]}
        actions={
          <Button onClick={() => router.push(`${base}/new`)}>
            <Plus size={16} className="mr-1" /> Add customer
          </Button>
        }
      />

      <FilterBar
        searchPlaceholder="Search by name, phone, email, tax #"
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />

      <DataTable<PosCustomer>
        columns={columns}
        data={data?.items ?? []}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage={
          search
            ? 'No matching customers.'
            : 'No customers yet — add one or create from the register.'
        }
        onRowClick={(c) => router.push(`${base}/${c.id}`)}
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

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Delete customer?"
        description={
          confirmDelete
            ? `"${confirmDelete.name}" will be removed. Past sales referencing this customer keep their snapshotted name.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={onDelete}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
