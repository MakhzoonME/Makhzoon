'use client';

// Shared directory over pos_customers. Haraka calls these Customers; Zeyara
// calls them Patients. Same rows, same API — only the vocabulary and the
// permission namespace differ.
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, ArrowRight, Copy, Settings2 } from 'lucide-react';
import { PageHeader, DataTable, FilterBar, ConfirmDialog, BulkActionsBar, ExportButton } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { useVertical } from '@/components/vertical/VerticalProvider';
import { useCustomers, useDeleteCustomer } from '@/hooks/haraka';
import { toast, useT, useModuleGuard } from '@/hooks/ui';
import { useAuthStore } from '@/store/auth.store';
import { useAccessibleSpaces } from '@/hooks/spaces';
import { hasPermission } from '@/lib/permissions';
import { MoveResourceDialog } from '@/components/spaces/MoveResourceDialog';
import { DuplicateResourceDialog } from '@/components/spaces/DuplicateResourceDialog';
import type { PosCustomer } from '@/types';
import { useOrgInfo } from '@/hooks/org';

export function CustomersListPage() {
  const { vertical, featureKey, permModule, basePath, colorVar } = useVertical();
  const { isAllowed } = useModuleGuard({ featureKey, moduleKey: permModule });
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
  // action — no separate bulk permission. Checks resolve against the ACTIVE
  // vertical's namespace, so a clinic user is judged on zeyara.* alone.
  const canBulkDelete = !!user && hasPermission(user, permModule, 'customersDelete');
  const canBulkMove = !!user && hasPermission(user, permModule, 'customersUpdate');
  const canCreate = !!user && hasPermission(user, permModule, 'customersCreate');
  const canBulkDuplicate = canCreate;
  const canManageFields = !!user && hasPermission(user, 'banna', 'create');
  const canExport = !!user && hasPermission(user, permModule, 'customersExport');
  const showSelection = canBulkDelete || canBulkMove || canBulkDuplicate;
  const { data: spaceList } = useAccessibleSpaces();
  const hasMultipleSpaces = (spaceList?.items?.length ?? 0) > 1;

  if (!isAllowed) return null;

  const isClinic = vertical === 'zeyara';
  // Zeyara's directory lives at /zeyara/patients; Haraka's at /haraka/customers.
  const base = `${basePath}/${isClinic ? 'patients' : 'customers'}`;
  const title = isClinic ? t('zeyara.patientsTitle') : t('customers.title');

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
        title={title}
        description={isClinic ? t('zeyara.patientsSubtitle') : t('customers.subtitle')}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: isClinic ? t('nav.zeyara') : t('nav.pos'), href: basePath },
          { label: title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {canManageFields && (
              <Button size="sm" variant="outline" onClick={() => router.push(`${base}/fields`)}>
                <Settings2 size={16} className="me-1" />{' '}
                {isClinic ? t('zeyara.patientFields') : t('customers.customFields')}
              </Button>
            )}
            {canExport && (
              <ExportButton
                filename={isClinic ? 'patients' : 'customers'}
                label={isClinic ? 'patients' : 'customers'}
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
              <Button size="sm" onClick={() => router.push(`${base}/new`)} style={{ background: colorVar }}>
                <Plus size={16} className="me-1" />{' '}
                {isClinic ? t('zeyara.addPatient') : t('customers.addCustomer')}
              </Button>
            )}
          </div>
        }
      />

      <FilterBar
        searchPlaceholder={isClinic ? t('zeyara.patientSearchPlaceholder') : t('customers.searchPlaceholder')}
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
            : isClinic ? t('zeyara.noPatients') : t('customers.noCustomers')
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
        title={isClinic ? t('zeyara.deletePatientTitle') : t('customers.deleteTitle')}
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
