'use client';
import { useMemo, useState } from 'react';
import { Plus, Trash2, Lock, AlertTriangle } from 'lucide-react';
import { useT } from '@/hooks/ui';
import { useUsers } from '@/hooks/users';
import {
  useSpaceMembers,
  useAddSpaceMember,
  useRemoveSpaceMember,
} from '@/hooks/spaces';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/ui';
import type { Space } from '@/types/space.types';
import type { OrgUser } from '@/types/user.types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  space: Space | null;
}

/**
 * Per-space members panel — view, add, and remove users for a specific
 * space. Org-wide users with `all_spaces=true` (typically owners) are
 * shown with a lock badge and a hint that their access doesn't need a
 * membership row; they're listed so admins know who can see this space.
 */
export function SpaceMembersDrawer({ open, onOpenChange, space }: Props) {
  const { t } = useT();
  const { data: members, isLoading: membersLoading } = useSpaceMembers(space?.id);
  const { data: allUsers = [] as OrgUser[] } = useUsers() as { data: OrgUser[] | undefined };
  const addMut = useAddSpaceMember();
  const removeMut = useRemoveSpaceMember();
  const [userToAdd, setUserToAdd] = useState<string>('');
  const [filter, setFilter] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<{ userId: string; name: string } | null>(null);

  const memberIds = useMemo(
    () => new Set((members?.items ?? []).map((m) => m.userId)),
    [members],
  );

  // Owners (and anyone flagged all_spaces) shouldn't appear in the
  // "Add a member" dropdown — they already see every space. We can't
  // tell from OrgUser here since allSpaces isn't on that type, but
  // owners are universally all-spaces; everyone else needs explicit
  // membership.
  const eligibleToAdd = useMemo(() => {
    return allUsers
      .filter((u) => u.role !== 'org_owner') // owners already see everything
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

  function handleAdd() {
    if (!space || !userToAdd) return;
    addMut.mutate(
      { spaceId: space.id, userId: userToAdd },
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
    if (!space || !confirmRemove) return;
    removeMut.mutate(
      { spaceId: space.id, userId: confirmRemove.userId },
      {
        onSuccess: () => {
          toast.success(t('spaces.memberRemoved'));
          setConfirmRemove(null);
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={t('spaces.members')}
      description={space ? t('spaces.membersDesc').replace('{name}', space.name) : ''}
      width="lg"
    >
      {!space ? null : (
        <div className="space-y-6">
          {/* Add a member */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">{t('spaces.addMember')}</h3>
            <div className="flex items-center gap-2">
              <Input
                placeholder={t('spaces.searchUsers')}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="flex-1"
              />
              <Select value={userToAdd} onValueChange={setUserToAdd}>
                <SelectTrigger className="w-[220px]">
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
            <h3 className="text-sm font-semibold text-gray-900">
              {t('spaces.currentMembers')} ({memberRows.length})
            </h3>
            <div className="rounded-lg border border-border divide-y divide-border bg-surface-card">
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
                    onClick={() => setConfirmRemove({ userId: m.userId, name: m.displayName || m.email || m.userId })}
                    aria-label={t('spaces.removeMember')}
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* Owner / all-spaces hint */}
          <section className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
            <Lock className="h-3.5 w-3.5 text-amber-700 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
            <p className="text-xs text-amber-900">
              {t('spaces.ownersNote')}
            </p>
          </section>

          {/* Inline confirm */}
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
      )}
    </FormDrawer>
  );
}
