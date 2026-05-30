'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, ArrowRight, X, Copy } from 'lucide-react';
import { PageHeader, DataTable, FilterBar, ConfirmDialog } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { useCustomers, useDeleteCustomer } from '@/hooks/haraka';
import { toast, useT } from '@/hooks/ui';
import { useAuthStore } from '@/store/auth.store';
import { useAccessibleSpaces } from '@/hooks/spaces';
import { MoveResourceDialog } from '@/components/spaces/MoveResourceDialog';
import { DuplicateResourceDialog } from '@/components/spaces/DuplicateResourceDialog';
import type { PosCustomer } from '@/types';

export default function CustomersListPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { t } = useT();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCustomers({ search: search || undefined, page, pageSize: 20 });
  const deleteMut = useDeleteCustomer();
  const [confirmDelete, setConfirmDelete] = useState<PosCustomer | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [dupeOpen, setDupeOpen] = useState(false);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'org_owner' || user?.role === 'super_admin';
  const { data: spaceList } = useAccessibleSpaces();
  const hasMultipleSpaces = (spaceList?.items?.length ?? 0) > 1;

  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka/customers`;

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
          { label: t('nav.pos'), href: `/${params.locale}/${params.orgSlug}/${params.space}/haraka` },
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

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 mb-3 px-4 py-2 bg-primary-50 border border-primary-100 rounded-lg">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="h-7 w-7 rounded-md flex items-center justify-center text-primary-700 hover:bg-primary-100 transition-colors"
              aria-label={t('common.clear')}
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <span className="text-sm font-medium text-primary-900">
              {t('bulk.selected').replace('{count}', String(selectedIds.size))}
            </span>
          </div>
          {hasMultipleSpaces && isAdmin && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setDupeOpen(true)}>
                <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span className="ms-1">{t('duplicate.bulk')}</span>
              </Button>
              <Button size="sm" onClick={() => setMoveOpen(true)}>
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span className="ms-1">{t('move.bulkMove')}</span>
              </Button>
            </div>
          )}
        </div>
      )}

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
        selection={hasMultipleSpaces && isAdmin ? { selectedIds, onChange: setSelectedIds } : undefined}
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

      <MoveResourceDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        type="customer"
        ids={[...selectedIds]}
        recordLabel={t('bulk.selected').replace('{count}', String(selectedIds.size))}
        onMoved={() => setSelectedIds(new Set())}
      />

      <DuplicateResourceDialog
        open={dupeOpen}
        onOpenChange={setDupeOpen}
        type="customer"
        ids={[...selectedIds]}
        recordLabel={t('bulk.selected').replace('{count}', String(selectedIds.size))}
        onDuplicated={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
