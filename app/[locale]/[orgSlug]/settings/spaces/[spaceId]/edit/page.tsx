'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Trash2, Lock, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import {
  useSpace,
  useUpdateSpace,
  useSpaceMembers,
  useAddSpaceMember,
  useRemoveSpaceMember,
} from '@/hooks/spaces';
import { useUsers } from '@/hooks/users';
import { useOrgInfo } from '@/hooks/org';
import { useAdminGuard } from '@/hooks/ui';
import { toast, useT } from '@/hooks/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OrgUser } from '@/types/user.types';

export default function EditSpacePage() {
  const params = useParams<{ locale: string; orgSlug: string; spaceId: string }>();
  const router = useRouter();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const { isAllowed } = useAdminGuard('settings.orgInfo');
  const { space, isLoading } = useSpace(params.spaceId);
  const updateMut = useUpdateSpace();

  const { data: members, isLoading: membersLoading } = useSpaceMembers(params.spaceId);
  const { data: allUsers = [] as OrgUser[] } = useUsers() as { data: OrgUser[] | undefined };
  const addMut = useAddSpaceMember();
  const removeMut = useRemoveSpaceMember();

  const [name, setName] = useState('');
  const [userToAdd, setUserToAdd] = useState('');
  const [filter, setFilter] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<{ userId: string; name: string } | null>(null);

  useEffect(() => {
    if (space) setName(space.name);
  }, [space]);

  const base = `/${params.locale}/${params.orgSlug}/settings/spaces`;

  const memberIds = useMemo(
    () => new Set((members?.items ?? []).map((m) => m.userId)),
    [members],
  );

  const eligibleToAdd = useMemo(() => {
    return (allUsers ?? [])
      .filter((u) => u.role !== 'org_owner')
      .filter((u) => !memberIds.has(u.id))
      .filter((u) => u.status !== 'deactivated')
      .filter((u) => {
        if (!filter.trim()) return true;
        const q = filter.trim().toLowerCase();
        return (
          u.displayName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q)
        );
      });
  }, [allUsers, memberIds, filter]);

  const memberRows = members?.items ?? [];

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateMut.mutateAsync({ id: params.spaceId, name });
      toast.success(t('spaces.renamed'));
      router.push(base);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    }
  }

  function handleAdd() {
    if (!userToAdd) return;
    addMut.mutate(
      { spaceId: params.spaceId, userId: userToAdd },
      {
        onSuccess: () => {
          toast.success(t('spaces.memberAdded'));
          setUserToAdd('');
          setFilter('');
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  function handleRemove() {
    if (!confirmRemove) return;
    removeMut.mutate(
      { spaceId: params.spaceId, userId: confirmRemove.userId },
      {
        onSuccess: () => {
          toast.success(t('spaces.memberRemoved'));
          setConfirmRemove(null);
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  if (!isAllowed) return null;
  if (isLoading || !space) return <LoadingSkeleton rows={4} columns={1} />;

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title={space.name}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: t('nav.settings') },
          { label: t('spaces.title'), href: base },
          { label: space.name },
          { label: t('common.edit') },
        ]}
      />

      {/* Rename */}
      <form onSubmit={handleRename} className="space-y-5 bg-surface-card rounded-xl border border-border p-6 mb-6">
        <div>
          <Label htmlFor="space-name">{t('spaces.name')}</Label>
          <Input
            id="space-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="mt-1.5"
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('spaces.slugLocked').replace('{slug}', space.slug)}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push(base)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={updateMut.isPending || !name.trim() || name === space.name}
          >
            {t('common.saveChanges')}
          </Button>
        </div>
      </form>

      {/* Members */}
      <div className="bg-surface-card rounded-xl border border-border p-6 space-y-6">
        <h2 className="text-sm font-semibold text-gray-900">{t('spaces.members')}</h2>

        {/* Add member */}
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-gray-600">{t('spaces.addMember')}</h3>
          <div className="flex items-center gap-2">
            <Input
              placeholder={t('spaces.searchUsers')}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1"
            />
            <Select value={userToAdd} onValueChange={setUserToAdd}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('spaces.pickUser')} />
              </SelectTrigger>
              <SelectContent>
                {eligibleToAdd.length === 0 ? (
                  <div className="px-2.5 py-2 text-sm text-gray-500">{t('spaces.noEligibleUsers')}</div>
                ) : (
                  eligibleToAdd.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <span className="block truncate">{u.displayName || u.email || u.username}</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={!userToAdd || addMut.isPending} size="sm">
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="ms-1">{addMut.isPending ? t('spaces.adding') : t('spaces.add')}</span>
            </Button>
          </div>
          <p className="text-xs text-gray-500">{t('spaces.ownersNoteHere')}</p>
        </section>

        {/* Current members */}
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-gray-600">
            {t('spaces.currentMembers')} ({memberRows.length})
          </h3>
          <div className="rounded-lg border border-border divide-y divide-border bg-surface-page">
            {membersLoading && (
              <div className="px-4 py-6 text-sm text-gray-500 text-center">{t('userSpaces.loading')}</div>
            )}
            {!membersLoading && memberRows.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-500 text-center">{t('spaces.noMembers')}</div>
            )}
            {!membersLoading && memberRows.map((m) => (
              <div key={m.userId} className="flex items-center justify-between px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {m.displayName || m.email || m.userId}
                  </p>
                  {m.email && m.displayName && (
                    <p className="text-xs text-gray-500 truncate">{m.email}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() =>
                    setConfirmRemove({ userId: m.userId, name: m.displayName || m.email || m.userId })
                  }
                  aria-label={t('spaces.removeMember')}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Owners note */}
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
          <Lock className="h-3.5 w-3.5 text-amber-700 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
          <p className="text-xs text-amber-900">{t('spaces.ownersNote')}</p>
        </div>

        {/* Remove confirm */}
        {confirmRemove && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
              <p className="text-sm text-red-900">
                {t('spaces.removeConfirm').replace('{name}', confirmRemove.name)}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirmRemove(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRemove}
                disabled={removeMut.isPending}
              >
                {removeMut.isPending ? t('common.removing') : t('spaces.removeMember')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
