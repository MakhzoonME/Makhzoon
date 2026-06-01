'use client';
import { useState } from 'react';
import { Plus, Pencil, Archive, Undo2, Lock, Users, Info } from 'lucide-react';
import { SpaceMembersDrawer } from '@/components/spaces/SpaceMembersDrawer';
import { useT } from '@/hooks/ui';
import { useAdminGuard } from '@/hooks/ui';
import {
  useAllSpaces,
  useCreateSpace,
  useUpdateSpace,
  useAddSpaceMember,
} from '@/hooks/spaces';
import { useUsers } from '@/hooks/users';
import type { OrgUser } from '@/types/user.types';
import { PageHeader, DataTable, StatusBadge, FormDrawer, ConfirmDialog } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/ui';
import type { Space } from '@/types/space.types';

export default function SpacesSettingsPage() {
  const { t } = useT();
  const { isAllowed } = useAdminGuard('settings.orgInfo');
  const { data, isLoading } = useAllSpaces();
  const createMut = useCreateSpace();
  const updateMut = useUpdateSpace();
  const addMemberMut = useAddSpaceMember();

  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Space | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Space | null>(null);
  const [membersTarget, setMembersTarget] = useState<Space | null>(null);

  const spaces = data?.items ?? [];
  const onlyDefault = !isLoading && spaces.length === 1 && spaces[0]?.isDefault;

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
    {
      key: 'memberCount',
      header: t('spaces.members'),
      render: (s) => (
        <button
          type="button"
          onClick={() => setMembersTarget(s)}
          className="inline-flex items-center gap-1 text-xs text-gray-700 hover:text-primary-700"
        >
          <Users className="h-3 w-3" strokeWidth={2} />
          <span>{s.memberCount ?? 0}</span>
        </button>
      ),
    },
    { key: 'status', header: t('col.status'), render: (s) => <StatusBadge status={s.status} marker="dot" /> },
    {
      key: 'actions',
      header: t('col.actions'),
      render: (s) => (
        <div className="flex items-center gap-1 justify-end">
          <Button size="sm" variant="ghost" onClick={() => setMembersTarget(s)} aria-label={t('spaces.members')}>
            <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRenameTarget(s)} aria-label={t('spaces.rename')}>
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
      <PageHeader
        title={t('spaces.title')}
        description={t('spaces.description')}
        breadcrumb={[{ label: t('nav.settings') }]}
        actions={(
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.75} /><span className="ms-1">{t('spaces.newSpace')}</span>
          </Button>
        )}
      />

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

      {/* Create drawer */}
      <FormDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('spaces.newSpace')}
        description={t('spaces.newSpaceDesc')}
      >
        <CreateSpaceForm
          onCancel={() => setCreateOpen(false)}
          onSubmit={(values) => {
            createMut.mutate(
              { name: values.name, slug: values.slug },
              {
                onSuccess: async (res) => {
                  const created = res.space;
                  // Best-effort member adds — failures don't block the success toast,
                  // but they're reported individually.
                  if (values.memberIds.length > 0) {
                    const results = await Promise.allSettled(
                      values.memberIds.map((uid) =>
                        addMemberMut.mutateAsync({ spaceId: created.id, userId: uid }),
                      ),
                    );
                    const failed = results.filter((r) => r.status === 'rejected').length;
                    if (failed > 0) toast.error(t('spaces.memberAddPartial').replace('{count}', String(failed)));
                  }
                  toast.success(t('spaces.created'));
                  setCreateOpen(false);
                },
                onError: (e) => toast.error((e as Error).message),
              },
            );
          }}
          submitting={createMut.isPending || addMemberMut.isPending}
        />
      </FormDrawer>

      {/* Rename drawer */}
      <FormDrawer
        open={!!renameTarget}
        onOpenChange={(o) => !o && setRenameTarget(null)}
        title={t('spaces.rename')}
      >
        {renameTarget && (
          <RenameSpaceForm
            space={renameTarget}
            onCancel={() => setRenameTarget(null)}
            onSubmit={(name) => {
              updateMut.mutate({ id: renameTarget.id, name }, {
                onSuccess: () => { toast.success(t('spaces.renamed')); setRenameTarget(null); },
                onError: (e) => toast.error((e as Error).message),
              });
            }}
            submitting={updateMut.isPending}
          />
        )}
      </FormDrawer>

      {/* Archive confirm */}
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

      <SpaceMembersDrawer
        open={!!membersTarget}
        onOpenChange={(o) => !o && setMembersTarget(null)}
        space={membersTarget}
      />
    </div>
  );
}

/* ── inline form components ─────────────────────────────────── */

function CreateSpaceForm({
  onSubmit, onCancel, submitting,
}: {
  onSubmit: (v: { name: string; slug?: string; memberIds: string[] }) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const { t } = useT();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const { data: usersRaw = [] as OrgUser[] } = useUsers() as { data: OrgUser[] | undefined };
  // Owners already see every space via the all_spaces flag — no membership row needed.
  const eligibleUsers = (usersRaw ?? []).filter(
    (u) => u.role !== 'org_owner' && u.status !== 'deactivated',
  );

  function suggestSlug(v: string) {
    return v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function toggleMember(id: string) {
    setMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, slug: slug || undefined, memberIds: [...memberIds] });
      }}
    >
      <div>
        <Label htmlFor="space-name">{t('spaces.name')}</Label>
        <Input
          id="space-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slug) setSlug(suggestSlug(e.target.value));
          }}
          placeholder={t('spaces.namePlaceholder')}
          required
          autoFocus
        />
      </div>
      <div>
        <Label htmlFor="space-slug">{t('spaces.slug')}</Label>
        <Input
          id="space-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="branch-1"
        />
        <p className="text-xs text-gray-500 mt-1">{t('spaces.slugHelp')}</p>
      </div>

      {/* Initial members */}
      <div>
        <Label>{t('spaces.initialMembers')}</Label>
        <p className="text-xs text-gray-500 mt-0.5 mb-2">{t('spaces.initialMembersHint')}</p>
        {eligibleUsers.length === 0 ? (
          <p className="text-xs text-gray-500">{t('spaces.noEligibleUsers')}</p>
        ) : (
          <div className="rounded-lg border border-border max-h-48 overflow-y-auto divide-y divide-border bg-surface-card">
            {eligibleUsers.map((u) => {
              const checked = memberIds.has(u.id);
              return (
                <label key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-surface-page">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMember(u.id)}
                    className="h-4 w-4 rounded border-border accent-primary-600"
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 truncate">{u.displayName || u.email || u.username}</p>
                    {u.displayName && (u.email || u.username) && (
                      <p className="text-xs text-gray-500 truncate">{u.email ?? u.username}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button type="submit" disabled={submitting || !name.trim()}>{t('spaces.create')}</Button>
      </div>
    </form>
  );
}

function RenameSpaceForm({
  space, onSubmit, onCancel, submitting,
}: {
  space: Space;
  onSubmit: (name: string) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const { t } = useT();
  const [name, setName] = useState(space.name);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => { e.preventDefault(); onSubmit(name); }}
    >
      <div>
        <Label htmlFor="space-rename">{t('spaces.name')}</Label>
        <Input
          id="space-rename"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
      </div>
      <p className="text-xs text-gray-500">
        {t('spaces.slugLocked').replace('{slug}', space.slug)}
      </p>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button type="submit" disabled={submitting || !name.trim() || name === space.name}>{t('common.save')}</Button>
      </div>
    </form>
  );
}
