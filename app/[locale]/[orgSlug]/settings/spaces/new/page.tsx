'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared';
import { useCreateSpace, useAddSpaceMember } from '@/hooks/spaces';
import { useUsers } from '@/hooks/users';
import { useOrgInfo } from '@/hooks/org';
import { useAdminGuard } from '@/hooks/ui';
import { toast, useT } from '@/hooks/ui';
import type { OrgUser } from '@/types/user.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function suggestSlug(v: string) {
  return v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function NewSpacePage() {
  const params = useParams<{ locale: string; orgSlug: string }>();
  const router = useRouter();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const { isAllowed } = useAdminGuard('settings.orgInfo');

  const createMut = useCreateSpace();
  const addMemberMut = useAddSpaceMember();
  const { data: usersRaw = [] as OrgUser[] } = useUsers() as { data: OrgUser[] | undefined };

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());

  const base = `/${params.locale}/${params.orgSlug}/settings/spaces`;

  const eligibleUsers = (usersRaw ?? []).filter(
    (u) => u.role !== 'org_owner' && u.status !== 'deactivated',
  );

  function toggleMember(id: string) {
    setMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await createMut.mutateAsync({ name, slug: slug || undefined });
      const created = res.space;
      if (memberIds.size > 0) {
        const results = await Promise.allSettled(
          [...memberIds].map((uid) =>
            addMemberMut.mutateAsync({ spaceId: created.id, userId: uid }),
          ),
        );
        const failed = results.filter((r) => r.status === 'rejected').length;
        if (failed > 0) toast.error(t('spaces.memberAddPartial').replace('{count}', String(failed)));
      }
      toast.success(t('spaces.created'));
      router.push(base);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    }
  }

  if (!isAllowed) return null;

  const submitting = createMut.isPending || addMemberMut.isPending;

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title={t('spaces.newSpace')}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: t('nav.settings') },
          { label: t('spaces.title'), href: base },
          { label: t('spaces.newSpace') },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-5 bg-surface-card rounded-xl border border-border p-6">
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
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="space-slug">{t('spaces.slug')}</Label>
          <Input
            id="space-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="branch-1"
            className="mt-1.5"
          />
          <p className="text-xs text-gray-500 mt-1">{t('spaces.slugHelp')}</p>
        </div>

        <div>
          <Label>{t('spaces.initialMembers')}</Label>
          <p className="text-xs text-gray-500 mt-0.5 mb-2">{t('spaces.initialMembersHint')}</p>
          {eligibleUsers.length === 0 ? (
            <p className="text-xs text-gray-500">{t('spaces.noEligibleUsers')}</p>
          ) : (
            <div className="rounded-lg border border-border max-h-52 overflow-y-auto divide-y divide-border bg-surface-page">
              {eligibleUsers.map((u) => {
                const checked = memberIds.has(u.id);
                return (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer hover:bg-surface-card"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMember(u.id)}
                      className="h-4 w-4 rounded border-border accent-primary-600"
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {u.displayName || u.email || u.username}
                      </p>
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

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => router.push(base)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting || !name.trim()}>
            {t('spaces.create')}
          </Button>
        </div>
      </form>
    </div>
  );
}
