'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Pencil, Archive, Undo2, Lock, Info } from 'lucide-react';
import { useT, useOrgSlug } from '@/hooks/ui';
import { useAdminGuard } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { useAllSpaces, useUpdateSpace } from '@/hooks/spaces';
import { DataTable, StatusBadge, ConfirmDialog } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/ui';
import type { Space } from '@/types/space.types';

export default function SpacesSettingsPage() {
  const { t } = useT();
  const params = useParams<{ locale: string; orgSlug: string }>();
  const router = useRouter();
  useOrgSlug();
  useOrgInfo();
  const { isAllowed } = useAdminGuard('settings.orgInfo');
  const { data, isLoading } = useAllSpaces();
  const updateMut = useUpdateSpace();

  const [archiveTarget, setArchiveTarget] = useState<Space | null>(null);

  const spaces = data?.items ?? [];
  const onlyDefault = !isLoading && spaces.length === 1 && spaces[0]?.isDefault;

  const base = `/${params.locale}/${params.orgSlug}/settings/spaces`;

  const columns: ColumnDef<Space>[] = [
    {
      key: 'name',
      header: t('spaces.name'),
      render: (s) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{s.name}</span>
          {s.isDefault && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
              <Lock className="h-3 w-3" strokeWidth={2} />
              {t('spaces.default')}
            </span>
          )}
        </div>
      ),
    },
    { key: 'slug', header: t('spaces.slug'), render: (s) => <span className="font-mono text-xs text-gray-600">{s.slug}</span> },
    { key: 'status', header: t('col.status'), render: (s) => <StatusBadge status={s.status} marker="dot" /> },
    {
      key: 'actions',
      header: t('col.actions'),
      render: (s) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push(`${base}/${s.id}/edit`)}
            aria-label={t('common.edit')}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Button>
          {!s.isDefault && s.status === 'active' && (
            <Button
              size="sm" variant="ghost"
              className="text-amber-600 hover:bg-amber-50"
              onClick={() => setArchiveTarget(s)}
              aria-label={t('spaces.archive')}
            >
              <Archive className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Button>
          )}
          {!s.isDefault && s.status === 'archived' && (
            <Button
              size="sm" variant="ghost"
              className="text-emerald-600 hover:bg-emerald-50"
              onClick={() => updateMut.mutate({ id: s.id, status: 'active' }, {
                onSuccess: () => toast.success(t('spaces.restored')),
                onError: (e) => toast.error((e as Error).message),
              })}
              aria-label={t('spaces.restore')}
            >
              <Undo2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (!isAllowed) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">{t('spaces.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('spaces.description')}</p>
        </div>
        <Button size="sm" onClick={() => router.push(`${base}/new`)}>
          <Plus className="h-4 w-4" strokeWidth={1.75} /><span className="ms-1">{t('spaces.newSpace')}</span>
        </Button>
      </div>

      {onlyDefault && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-primary-50 border border-primary-100 px-3 py-2.5">
          <Info className="h-4 w-4 text-primary-700 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
          <div className="text-sm text-primary-900">
            <p className="font-medium">{t('spaces.gettingStartedTitle')}</p>
            <p className="text-xs text-primary-800 mt-0.5">{t('spaces.gettingStartedDesc')}</p>
          </div>
        </div>
      )}

      <div className="bg-surface-card rounded-lg border border-border">
        <DataTable
          data={spaces}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('spaces.empty')}
          keyExtractor={(s) => s.id}
        />
      </div>

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        title={t('spaces.archiveTitle')}
        description={
          archiveTarget
            ? t('spaces.archiveDesc').replace('{name}', archiveTarget.name)
            : ''
        }
        confirmLabel={t('spaces.archive')}
        variant="destructive"
        onConfirm={() => {
          if (!archiveTarget) return;
          updateMut.mutate({ id: archiveTarget.id, status: 'archived' }, {
            onSuccess: () => { toast.success(t('spaces.archived')); setArchiveTarget(null); },
            onError: (e) => toast.error((e as Error).message),
          });
        }}
        loading={updateMut.isPending}
      />
    </div>
  );
}
