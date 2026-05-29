'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, DataTable, FilterBar, ConfirmDialog } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { useCustomers, useDeleteCustomer } from '@/hooks/haraka';
import { toast, useT } from '@/hooks/ui';
import type { PosCustomer } from '@/types';

export default function CustomersListPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string }>();
  const { t } = useT();
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
      toast.success(t('common.deleted'));
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.deleteFailed'));
    }
  }

  const columns: ColumnDef<PosCustomer>[] = [
    { key: 'name', header: t('col.name'), sortable: true, render: (c) => c.name },
    { key: 'phone', header: t('col.phone'), render: (c) => c.phone ?? '—' },
    { key: 'email', header: t('col.email'), render: (c) => c.email ?? '—' },
    { key: 'taxNumber', header: t('col.taxNumber'), render: (c) => c.taxNumber ?? '—' },
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
            aria-label={t('common.edit')}
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
            aria-label={t('common.delete')}
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
        title={t('customers.title')}
        description={t('customers.subtitle')}
        breadcrumb={[
          { label: t('nav.pos'), href: `/${params.locale}/${params.orgSlug}/haraka` },
          { label: t('customers.title'), href: '#' },
        ]}
        actions={
          <Button onClick={() => router.push(`${base}/new`)}>
            <Plus size={16} className="me-1" /> {t('customers.addCustomer')}
          </Button>
        }
      />

      <FilterBar
        searchPlaceholder={t('customers.searchPlaceholder')}
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
            ? t('customers.noMatching')
            : t('customers.noCustomers')
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
        title={t('customers.deleteTitle')}
        description={
          confirmDelete
            ? t('customers.deleteDesc').replace('{name}', confirmDelete.name)
            : ''
        }
        confirmLabel={t('common.delete')}
        onConfirm={onDelete}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
