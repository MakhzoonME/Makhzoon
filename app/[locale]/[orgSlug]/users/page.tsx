'use client';
import { useEffect, useState } from 'react';
import { useUsers } from '@/hooks/users';
import { useInvites } from '@/hooks/users';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubscriptionGate } from '@/components/shared';
import { OrgUser, Invite } from '@/types';
import { formatDate } from '@/lib/utils/date';
import { InviteUserModal } from '@/components/users/InviteUserModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast, useAdminGuard, useOrgSlug } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { apiFetch } from '@/lib/utils/api-fetch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PermissionsEditor } from '@/components/users/PermissionsEditor';
import { UserSpaceAccess } from '@/components/users/UserSpaceAccess';
import { useUserSpaceAccess, useUpdateUserSpaceAccess } from '@/hooks/spaces';
import { useSubscriptionFeatures } from '@/hooks/org';
import { UserPermissions, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_STAFF_PERMISSIONS } from '@/types';
import { useT } from '@/hooks/ui';
import type { MessageKey } from '@/locales/messages';
import { Plus, Pencil, Trash2, MailX, KeyRound, Copy, Check, Search } from 'lucide-react';


const ROLE_STYLE: Record<string, string> = {
  admin:       'bg-[var(--primary-100)] text-[var(--primary-700)]',
  super_admin: 'bg-[var(--purple-100)] text-[var(--purple-700)]',
  org_owner:   'bg-[var(--purple-100)] text-[var(--purple-700)]',
  staff:       'bg-surface-page text-gray-600',
};

const ROLE_KEY: Record<string, MessageKey> = {
  admin: 'role.admin',
  super_admin: 'role.superAdmin',
  org_owner: 'role.orgOwner',
  staff: 'role.staff',
};

const STATUS_KEY: Record<string, MessageKey> = {
  active: 'userStatus.active',
  deactivated: 'userStatus.deactivated',
  pending: 'userStatus.pending',
  expired: 'userStatus.expired',
  revoked: 'userStatus.revoked',
};

const STATUS_STYLE: Record<string, string> = {
  active:      'bg-[var(--green-100)] text-[var(--green-700)]',
  deactivated: 'bg-[var(--red-100)] text-[var(--red-700)]',
  pending:     'bg-[var(--yellow-100)] text-[var(--yellow-700)]',
  expired:     'bg-surface-page text-gray-500',
  revoked:     'bg-[var(--red-100)] text-[var(--red-700)]',
};

function RoleBadge({ role }: { role: string }) {
  const { t } = useT();
  return (
    <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', ROLE_STYLE[role] ?? 'bg-surface-page text-gray-600')}>
      {ROLE_KEY[role] ? t(ROLE_KEY[role]) : role.replace('_', ' ')}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useT();
  return (
    <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', STATUS_STYLE[status] ?? 'bg-surface-page text-gray-600')}>
      {STATUS_KEY[status] ? t(STATUS_KEY[status]) : status}
    </span>
  );
}

function displayIdentifier(email?: string | null, username?: string | null): string {
  if (email && !email.endsWith('@makhzoon.local')) return email;
  if (username) return `@${username}`;
  return '—';
}

function UserAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2);
  return (
    <div
      aria-hidden
      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-semibold flex-shrink-0"
      style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}
    >
      {initials || '?'}
    </div>
  );
}

export default function UsersPage() {
  const { t } = useT();
  const orgSlug = useOrgSlug();
  const { data: orgInfo } = useOrgInfo();
  const { isAllowed } = useAdminGuard('settings.users');
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: invites = [], isLoading: invitesLoading } = useInvites();
  const { user: currentUser } = useAuthStore();

  const [tab, setTab] = useState<'members' | 'invites'>('members');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showInvite, setShowInvite] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<OrgUser | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const [editPermissions, setEditPermissions] = useState<UserPermissions>(DEFAULT_STAFF_PERMISSIONS);
  const [showEditPerms, setShowEditPerms] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [editSpaceAccess, setEditSpaceAccess] = useState<{ allSpaces: boolean; spaceIds: string[] }>({ allSpaces: false, spaceIds: [] });
  const { data: serverSpaceAccess } = useUserSpaceAccess(editTarget?.id);
  const updateSpaceAccessMut = useUpdateUserSpaceAccess();
  useEffect(() => {
    if (editTarget && serverSpaceAccess) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditSpaceAccess(serverSpaceAccess);
    }
  }, [editTarget, serverSpaceAccess]);
  const features = useSubscriptionFeatures();
  const [deleteTarget, setDeleteTarget] = useState<{ user: OrgUser; permanent: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetTarget, setResetTarget] = useState<OrgUser | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ type: 'email_sent' | 'temp_password'; password?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [now] = useState(() => Date.now());
  const qc = useQueryClient();

  if (!isAllowed) return <div className="flex items-center justify-center h-48"><div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>;

  const isLoading = usersLoading || invitesLoading;
  const currentRole = currentUser?.role ?? '';
  const isOwnerOrSuperAdmin = currentRole === 'org_owner' || currentRole === 'super_admin';
  const isAdmin = currentRole === 'admin' || isOwnerOrSuperAdmin;
  const canInvite = isAdmin;

  const pendingInvites = invites.filter(
    (i) => i.status === 'pending' && new Date(i.expiresAt).getTime() > now
  );

  function canEditUser(target: OrgUser): boolean {
    if (isOwnerOrSuperAdmin) return true;
    if (target.id === currentUser?.uid) return false;
    if (target.role === 'org_owner') return false;
    return isAdmin;
  }

  const filteredUsers = users.filter((u: OrgUser) => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.displayName.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    const matchStatus = !statusFilter || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const filteredInvites = pendingInvites.filter((inv) => {
    const q = search.toLowerCase();
    return !q || (inv.email ?? '').toLowerCase().includes(q);
  });

  async function handleRevoke(invite: Invite) {
    setRevoking(invite.token);
    try {
      const res = await apiFetch(`/api/invites/${invite.token}/revoke`, { method: 'POST' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? 'Failed to revoke invite');
      }
      toast.success(t('common.removed'));
      qc.invalidateQueries({ queryKey: ['invites'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.removeFailed'));
    } finally {
      setRevoking(null);
    }
  }

  function defaultPermsForRole(role: string): UserPermissions {
    return role === 'staff' ? DEFAULT_STAFF_PERMISSIONS : DEFAULT_ADMIN_PERMISSIONS;
  }

  function openEditRole(u: OrgUser) {
    setEditTarget(u);
    setEditRole(u.role);
    setEditPermissions(u.permissions ?? defaultPermsForRole(u.role));
    setShowEditPerms(false);
    setEditSpaceAccess({ allSpaces: u.role === 'org_owner', spaceIds: [] });
  }

  async function handleSaveRole() {
    if (!editTarget) return;
    setSavingRole(true);
    try {
      const res = await apiFetch(`/api/users/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, permissions: editPermissions }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? 'Failed to update role');
      }
      await updateSpaceAccessMut.mutateAsync({
        userId: editTarget.id,
        allSpaces: editSpaceAccess.allSpaces,
        spaceIds: editSpaceAccess.spaceIds,
      });
      toast.success(t('common.updated'));
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.updateFailed'));
    } finally {
      setSavingRole(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { user: target, permanent } = deleteTarget;
    try {
      const url = permanent ? `/api/users/${target.id}?permanent=true` : `/api/users/${target.id}`;
      const res = await apiFetch(url, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? (permanent ? 'Failed to delete user' : 'Failed to deactivate user'));
      }
      toast.success(permanent ? t('common.deleted') : t('common.updated'));
      qc.invalidateQueries({ queryKey: ['users'] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.failed'));
    } finally {
      setDeleting(false);
    }
  }

  async function handleResetPassword() {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const res = await apiFetch(`/api/users/${resetTarget.id}/reset-password`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Failed to reset password');
      setResetResult(data);
      setResetTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.failed'));
    } finally {
      setResetting(false);
    }
  }

  function handleCopyPassword(password: string) {
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function hasCustomPermissions(u: OrgUser): boolean {
    if (!u.permissions) return false;
    const defaults = defaultPermsForRole(u.role);
    return JSON.stringify(u.permissions) !== JSON.stringify(defaults);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('users.title')}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: t('users.title') },
        ]}
        actions={
          canInvite ? (
            <SubscriptionGate>
              <Button size="sm" onClick={() => setShowInvite(true)} className="cursor-pointer transition-colors duration-150">
                <Plus aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                <span className="ms-1">{t('users.inviteUser')}</span>
              </Button>
            </SubscriptionGate>
          ) : undefined
        }
      />

      {/* Segmented tabs */}
      <div className="inline-flex items-center rounded-md border border-border p-0.5 bg-surface-page">
        <button
          type="button"
          onClick={() => setTab('members')}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer',
            tab === 'members' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-surface-card',
          )}
        >
          {t('users.title')} · {users.length}
        </button>
        <button
          type="button"
          onClick={() => setTab('invites')}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer',
            tab === 'invites' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-surface-card',
          )}
        >
          {t('users.pendingInvites')} · {pendingInvites.length}
        </button>
      </div>

      <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-wrap">
          <div className="relative flex-1 min-w-[160px] max-w-[280px]">
            <Search aria-hidden className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" strokeWidth={1.75} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('users.searchMembers')}
              className="h-8 text-xs ps-8"
            />
          </div>
          {tab === 'members' && (
            <>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-8 text-xs border border-border rounded-md bg-surface-card px-2 text-gray-600 cursor-pointer"
              >
                <option value="">{t('users.role')}</option>
                <option value="org_owner">{t('role.orgOwner')}</option>
                <option value="admin">{t('role.admin')}</option>
                <option value="staff">{t('role.staff')}</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 text-xs border border-border rounded-md bg-surface-card px-2 text-gray-600 cursor-pointer"
              >
                <option value="">{t('users.status')}</option>
                <option value="active">{t('userStatus.active')}</option>
                <option value="deactivated">{t('userStatus.deactivated')}</option>
              </select>
            </>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-page">
              <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('users.name')}</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('users.emailUsername')}</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('users.role')}</th>
              {tab === 'members' && (
                <>
                  <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('users.permissions')}</th>
                  <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('users.status')}</th>
                  <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('users.joined')}</th>
                </>
              )}
              {tab === 'invites' && (
                <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('users.status')}</th>
              )}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-surface-page rounded animate-pulse" style={{ width: j === 0 ? '120px' : j === 1 ? '160px' : '80px' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : tab === 'members' ? (
              filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">{t('users.noResults')}</td>
                </tr>
              ) : filteredUsers.map((u: OrgUser) => {
                const editable = canEditUser(u);
                const isCustom = hasCustomPermissions(u);
                return (
                  <tr key={`user-${u.id}`} className="hover:bg-surface-page transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={u.displayName || u.email || '?'} />
                        <span className="font-medium text-gray-900">{u.displayName || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500" dir="ltr">{displayIdentifier(u.email, u.username)}</td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3">
                      {isCustom ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--primary-50)] text-[var(--primary-700)]">
                          {t('users.custom')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">{t('users.roleDefault')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-end">
                      {editable && (
                        <div className="flex items-center justify-end gap-1">
                          {u.status !== 'deactivated' && (
                            <>
                              <SubscriptionGate>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label={t('users.editUser')}
                                  className="text-gray-500 hover:text-primary-600 hover:bg-primary-50 cursor-pointer transition-colors duration-150"
                                  onClick={() => openEditRole(u)}
                                >
                                  <Pencil aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                                </Button>
                              </SubscriptionGate>
                              <SubscriptionGate>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label="Reset password"
                                  className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors duration-150"
                                  onClick={() => setResetTarget(u)}
                                >
                                  <KeyRound aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                                </Button>
                              </SubscriptionGate>
                              <SubscriptionGate>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label={t('users.deactivate')}
                                  className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 cursor-pointer transition-colors duration-150"
                                  onClick={() => setDeleteTarget({ user: u, permanent: false })}
                                >
                                  <Trash2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                                </Button>
                              </SubscriptionGate>
                            </>
                          )}
                          {u.status === 'deactivated' && (
                            <SubscriptionGate>
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={t('users.deleteUser')}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors duration-150"
                                onClick={() => setDeleteTarget({ user: u, permanent: true })}
                              >
                                <Trash2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                              </Button>
                            </SubscriptionGate>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              filteredInvites.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-400">{t('users.noPendingInvites')}</td>
                </tr>
              ) : filteredInvites.map((inv) => (
                <tr key={`invite-${inv.id}`} className="hover:bg-surface-page transition-colors bg-amber-50/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={inv.displayName || inv.email || '?'} />
                      <span className="font-medium text-gray-700">{inv.displayName || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500" dir="ltr">{displayIdentifier(inv.email, inv.username)}</td>
                  <td className="px-4 py-3"><RoleBadge role={inv.role} /></td>
                  <td className="px-4 py-3"><StatusBadge status="pending" /></td>
                  <td className="px-4 py-3 text-end">
                    {isAdmin && (
                      <SubscriptionGate>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1 cursor-pointer transition-colors duration-150"
                          disabled={revoking === inv.token}
                          onClick={() => handleRevoke(inv)}
                        >
                          <MailX aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                          {revoking === inv.token ? t('users.revoking') : t('users.revokeInvite')}
                        </Button>
                      </SubscriptionGate>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canInvite && <InviteUserModal open={showInvite} onOpenChange={setShowInvite} />}

      {/* Edit user dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('users.editUser')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 pt-4 pb-2">
            <p className="text-xs text-gray-500">
              {t('users.editing')} <span className="font-medium text-gray-900">{editTarget?.displayName || editTarget?.email}</span>
            </p>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700">{t('users.role')}</label>
              <Select
                value={editRole}
                onValueChange={(v) => {
                  setEditRole(v);
                  setEditPermissions(defaultPermsForRole(v));
                  setShowEditPerms(false);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isOwnerOrSuperAdmin && <SelectItem value="org_owner">{t('role.orgOwner')}</SelectItem>}
                  <SelectItem value="admin">{t('role.admin')}</SelectItem>
                  <SelectItem value="staff">{t('role.staff')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowEditPerms((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800 cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
                  <path d="M4 7h6M7 4v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                {showEditPerms ? t('permissions.hideAccess') : t('permissions.editAccess')}
              </button>
              {showEditPerms && (
                <PermissionsEditor
                  value={editPermissions}
                  onChange={setEditPermissions}
                  availableFeatures={features}
                />
              )}
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-sm font-medium text-gray-900">{t('userSpaces.title')}</p>
              <UserSpaceAccess
                value={editSpaceAccess}
                onChange={setEditSpaceAccess}
                role={editRole}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={savingRole} className="cursor-pointer">{t('common.cancel')}</Button>
            <Button onClick={handleSaveRole} disabled={savingRole} className="cursor-pointer">
              {savingRole ? t('users.saving') : t('users.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password confirm dialog */}
      <ConfirmDialog
        open={!!resetTarget}
        onOpenChange={(o) => !o && setResetTarget(null)}
        title="Reset Password"
        description={
          resetTarget?.username && !resetTarget?.email
            ? `A new temporary password will be generated for @${resetTarget.username}. Share it with them securely — they should change it after signing in.`
            : `A password reset link will be sent to ${resetTarget?.email ?? 'this user'}. They will have 24 hours to use it.`
        }
        confirmLabel="Reset Password"
        onConfirm={handleResetPassword}
        loading={resetting}
      />

      {/* Reset result dialog */}
      <Dialog open={!!resetResult} onOpenChange={(o) => !o && setResetResult(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Password Reset</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-3">
            {resetResult?.type === 'email_sent' ? (
              <p className="text-sm text-gray-700">A password reset link has been sent. The link expires in 24 hours.</p>
            ) : (
              <>
                <p className="text-sm text-gray-700">A temporary password has been set. Share it with the user securely and ask them to change it after signing in.</p>
                <div className="flex items-center gap-2 bg-surface-page border border-border rounded-lg px-3 py-2">
                  <code className="flex-1 text-sm font-mono text-gray-900 select-all">{resetResult?.password}</code>
                  <button
                    type="button"
                    aria-label="Copy password"
                    className="text-gray-400 hover:text-primary-600 transition-colors cursor-pointer"
                    onClick={() => handleCopyPassword(resetResult?.password ?? '')}
                  >
                    {copied ? <Check aria-hidden className="h-4 w-4 text-green-600" /> : <Copy aria-hidden className="h-4 w-4" />}
                  </button>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setResetResult(null)} className="cursor-pointer">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={deleteTarget?.permanent ? t('users.deleteUser') : t('users.deactivateUser')}
        description={deleteTarget?.permanent
          ? t('users.deleteDesc').replace('{name}', deleteTarget.user.displayName || deleteTarget.user.email || '')
          : t('users.deactivateDesc').replace('{name}', deleteTarget?.user.displayName || deleteTarget?.user.email || '')
        }
        confirmLabel={deleteTarget?.permanent ? t('users.deletePermanently') : t('users.deactivate')}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
