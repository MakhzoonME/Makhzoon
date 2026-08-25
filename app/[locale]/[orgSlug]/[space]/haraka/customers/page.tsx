'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, ArrowRight, Copy, Settings2 } from 'lucide-react';
import { PageHeader, DataTable, FilterBar, ConfirmDialog, BulkActionsBar, ExportButton } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { useCustomers, useDeleteCustomer } from '@/hooks/haraka';
import { toast, useT, useModuleGuard } from '@/hooks/ui';
import { useAuthStore } from '@/store/auth.store';
import { useAccessibleSpaces } from '@/hooks/spaces';
import { hasPermission } from '@/lib/permissions';
import { MoveResourceDialog } from '@/components/spaces/MoveResourceDialog';
import { DuplicateResourceDialog } from '@/components/spaces/DuplicateResourceDialog';
import type { PosCustomer } from '@/types';
import { useOrgInfo } from '@/hooks/org';

export default function CustomersListPage() {
  const { isAllowed } = useModuleGuard({ featureKey: 'pos', moduleKey: 'haraka' });
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCustomers({ search: search || undefined, page, pageSize: 20 });
  const deleteMut = useDeleteCustomer();
  const [confirmDelete, setConfirmDelete] = useState<PosCustomer | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [dupeOpen, setDupeOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { user } = useAuthStore();
  // Bulk actions are available to anyone who can do the equivalent single-item
  // action — no separate bulk permission.
  const canBulkDelete = !!user && hasPermission(user, 'haraka', 'customersDelete');
  const canBulkMove = !!user && hasPermission(user, 'haraka', 'customersUpdate');
  const canCreate = !!user && hasPermission(user, 'haraka', 'customersCreate');
  const canBulkDuplicate = canCreate;
  const canManageFields = !!user && hasPermission(user, 'banna', 'create');
  const canExport = !!user && hasPermission(user, 'haraka', 'customersExport');
  const showSelection = canBulkDelete || canBulkMove || canBulkDuplicate;
  const { data: spaceList } = useAccessibleSpaces();
  const hasMultipleSpaces = (spaceList?.items?.length ?? 0) > 1;

  if (!isAllowed) return null;

  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka/customers`;

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ids = [...selectedIds];
    const results = await Promise.allSettled(
      ids.map((id) => deleteMut.mutateAsync(id)),
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    const ok = ids.length - failed;
    if (ok > 0) toast.success(t('bulk.deleteSuccess').replace('{count}', String(ok)));
    if (failed > 0) toast.error(t('bulk.deletePartial').replace('{count}', String(failed)));
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    setBulkDeleting(false);
  }

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
    <div className="space-y-6">
      <PageHeader
        title={t('customers.title')}
        description={t('customers.subtitle')}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: t('nav.pos'), href: `/${params.locale}/${params.orgSlug}/${params.space}/haraka` },
          { label: t('customers.title') },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {canManageFields && (
              <Button size="sm" variant="outline" onClick={() => router.push(`${base}/fields`)}>
                <Settings2 size={16} className="me-1" /> {t('customers.customFields')}
              </Button>
            )}
            {canExport && (
              <ExportButton
                filename="customers"
                label="customers"
                ext="csv"
                showFiltered={false}
                getUrl={() => {
                  const p = new URLSearchParams();
                  if (search) p.set('search', search);
                  return `/api/haraka/customers/export?${p.toString()}`;
                }}
              />
            )}
            {canCreate && (
              <Button size="sm" onClick={() => router.push(`${base}/new`)}>
                <Plus size={16} className="me-1" /> {t('customers.addCustomer')}
              </Button>
            )}
          </div>
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

      <BulkActionsBar count={selectedIds.size} onClear={() => setSelectedIds(new Set())}>
        {hasMultipleSpaces && canBulkDuplicate && (
          <Button size="sm" variant="ghost" className="!text-white hover:bg-white/10" onClick={() => setDupeOpen(true)}>
            <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="ms-1">{t('duplicate.bulk')}</span>
          </Button>
        )}
        {hasMultipleSpaces && canBulkMove && (
          <Button size="sm" variant="ghost" className="!text-white hover:bg-white/10" onClick={() => setMoveOpen(true)}>
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="ms-1">{t('move.bulkMove')}</span>
          </Button>
        )}
        {canBulkDelete && (
          <Button size="sm" variant="ghost" className="!text-red-300 hover:bg-red-500/15 hover:!text-red-200" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="ms-1">{t('bulk.delete')}</span>
          </Button>
        )}
      </BulkActionsBar>

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
        selection={showSelection ? { selectedIds, onChange: setSelectedIds } : undefined}
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

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={t('bulk.deleteTitle')}
        description={t('bulk.deleteDesc').replace('{count}', String(selectedIds.size))}
        confirmLabel={t('bulk.delete')}
        variant="destructive"
        onConfirm={handleBulkDelete}
        loading={bulkDeleting}
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
