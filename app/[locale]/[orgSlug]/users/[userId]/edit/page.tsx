'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useUsers } from '@/hooks/users';
import { useUserSpaceAccess, useUpdateUserSpaceAccess } from '@/hooks/spaces';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserAccessForm, type SpaceAccessValue } from '@/components/users/UserAccessForm';
import { toast, useT, useOrgSlug, useAdminGuard } from '@/hooks/ui';
import { apiFetch } from '@/lib/utils/api-fetch';
import { useAuthStore } from '@/store/auth.store';
import { DEFAULT_ADMIN_PERMISSIONS, DEFAULT_STAFF_PERMISSIONS } from '@/types';
import type { UserPermissions, OrgUser } from '@/types';

function defaultPermsForRole(role: string): UserPermissions {
  if (role === 'org_owner' || role === 'admin') return DEFAULT_ADMIN_PERMISSIONS;
  return DEFAULT_STAFF_PERMISSIONS;
}

// Deep-merge: role defaults fill any new fields added after permissions were
// last saved, so a stored (possibly stale) grant never silently loses a
// newly-added operation.
function mergeWithDefaults(stored: UserPermissions | null | undefined, role: string): UserPermissions {
  const defaults = defaultPermsForRole(role);
  if (!stored) return defaults;
  const merged: Record<string, unknown> = {};
  for (const key of Object.keys(defaults) as (keyof UserPermissions)[]) {
    merged[key] = {
      ...(defaults[key] as unknown as Record<string, boolean>),
      ...((stored[key] as unknown as Record<string, boolean>) ?? {}),
    };
  }
  return merged as unknown as UserPermissions;
}

export default function EditUserPage(props: { params: Promise<{ userId: string }> }) {
  const { userId } = use(props.params);
  const { isAllowed } = useAdminGuard('settingsUsers.update');
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { t, locale } = useT();
  const qc = useQueryClient();
  const { user: currentUser, refreshFeatures } = useAuthStore();
  const features = currentUser?.features ?? {};

  const { data: users = [], isLoading: usersLoading } = useUsers();
  const target = users.find((u: OrgUser) => u.id === userId) ?? null;

  const { data: serverSpaceAccess } = useUserSpaceAccess(userId);
  const updateSpaceAccessMut = useUpdateUserSpaceAccess();

  const [role, setRole] = useState('staff');
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_STAFF_PERMISSIONS);
  const [permissionsModified, setPermissionsModified] = useState(false);
  const [spaceAccess, setSpaceAccess] = useState<SpaceAccessValue>({ allSpaces: false, spaceIds: [] });
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate local state once the target user loads (mirrors the old modal's
  // openEditRole). Guarded by `hydrated` so it only runs once per target.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!target || hydrated) return;
    setRole(target.role);
    setPermissions(mergeWithDefaults(target.permissions as UserPermissions | undefined, target.role));
    setSpaceAccess({ allSpaces: target.role === 'org_owner', spaceIds: [] });
    setHydrated(true);
  }, [target, hydrated]);

  useEffect(() => {
    if (serverSpaceAccess) setSpaceAccess(serverSpaceAccess);
  }, [serverSpaceAccess]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const currentRole = currentUser?.role ?? '';
  const isOwnerOrSuperAdmin = currentRole === 'org_owner' || currentRole === 'super_admin';
  const isAdmin = currentRole === 'admin' || isOwnerOrSuperAdmin;

  // Mirrors the server's own rules so the page doesn't let someone attempt an
  // edit that's just going to 403 — the server (app/api/users/[userId]/route.ts)
  // remains the source of truth.
  const canEditTarget = (() => {
    if (!target) return true; // unknown yet — don't flash a false denial
    if (isOwnerOrSuperAdmin) return true;
    if (target.id === currentUser?.uid) return false;
    if (target.role === 'org_owner') return false;
    return isAdmin;
  })();

  function handleRoleChange(next: string) {
    setRole(next);
    setPermissions(defaultPermsForRole(next));
    setPermissionsModified(false);
  }

  async function handleSave() {
    if (!target) return;
    setSaving(true);
    try {
      const shouldSendPermissions = role === 'staff' || !!target.permissions || permissionsModified;
      const res = await apiFetch(`/api/users/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          permissions: shouldSendPermissions ? permissions : null,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? 'Failed to update role');
      }
      await updateSpaceAccessMut.mutateAsync({
        userId: target.id,
        allSpaces: spaceAccess.allSpaces,
        spaceIds: spaceAccess.spaceIds,
      });
      toast.success(t('common.updated'));
      qc.invalidateQueries({ queryKey: ['users'] });
      if (target.id === currentUser?.uid) await refreshFeatures();
      router.push(`/${locale}/${orgSlug}/users`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.updateFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (!isAllowed || usersLoading) {
    return <div className="flex items-center justify-center h-48"><div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>;
  }
  if (!target) {
    return <div className="p-6 text-sm text-gray-500">User not found.</div>;
  }
  if (!canEditTarget) {
    return <div className="p-6 text-sm text-gray-500">You don&apos;t have permission to edit this user.</div>;
  }

  const roleOptions = [
    ...(isOwnerOrSuperAdmin ? [{ value: 'org_owner', label: t('role.orgOwner') }] : []),
    { value: 'admin', label: t('role.admin') },
    { value: 'staff', label: t('role.staff') },
  ];

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={t('users.editUser')}
        breadcrumb={[
          { label: t('nav.users'), href: `/${locale}/${orgSlug}/users` },
          { label: target.displayName || target.email || '' },
        ]}
      />

      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="text-xs text-gray-500">
            {t('users.editing')} <span className="font-medium text-gray-900">{target.displayName || target.email}</span>
          </p>

          <UserAccessForm
            role={role}
            onRoleChange={handleRoleChange}
            roleOptions={roleOptions}
            permissions={permissions}
            onPermissionsChange={(v) => { setPermissions(v); setPermissionsModified(true); }}
            spaceAccess={spaceAccess}
            onSpaceAccessChange={setSpaceAccess}
            availableFeatures={features}
          />

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => router.push(`/${locale}/${orgSlug}/users`)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t('users.saving') : t('users.saveChanges')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
