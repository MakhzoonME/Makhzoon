'use client';
import { useState } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { useInvites } from '@/hooks/useInvites';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { OrgUser, Invite } from '@/types';
import { formatDate } from '@/lib/utils/date';
import { InviteUserModal } from '@/components/users/InviteUserModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { apiFetch } from '@/lib/utils/api-fetch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

function PlusSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function MailXSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M1 3h9a1 1 0 0 1 1 1v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <path d="M1 4l5 3 5-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9 9l3.5 3.5M12.5 9l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function EditSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
function Trash2SVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 3.5h10M5.5 3.5V2.5h3v1M4 3.5l.75 8h4.5L10 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Row =
  | { _type: 'user'; data: OrgUser }
  | { _type: 'invite'; data: Invite };

const ROLE_STYLE: Record<string, string> = {
  admin:       'bg-indigo-50 text-indigo-700',
  super_admin: 'bg-violet-50 text-violet-700',
  org_owner:   'bg-purple-50 text-purple-700',
  staff:       'bg-gray-100 text-gray-600',
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  super_admin: 'Super Admin',
  org_owner: 'Owner',
  staff: 'Staff',
};

const STATUS_STYLE: Record<string, string> = {
  active:      'bg-emerald-50 text-emerald-700',
  deactivated: 'bg-red-50 text-red-600',
  pending:     'bg-amber-50 text-amber-700',
  expired:     'bg-gray-100 text-gray-500',
  revoked:     'bg-red-50 text-red-500',
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', ROLE_STYLE[role] ?? 'bg-gray-100 text-gray-600')}>
      {ROLE_LABEL[role] ?? role.replace('_', ' ')}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize', STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600')}>
      {status}
    </span>
  );
}

export default function UsersPage() {
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: invites = [], isLoading: invitesLoading } = useInvites();
  const { user: currentUser } = useAuthStore();
  const [showInvite, setShowInvite] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<OrgUser | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const [savingRole, setSavingRole] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ user: OrgUser; permanent: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();

  const isLoading = usersLoading || invitesLoading;
  const currentRole = currentUser?.role ?? '';
  const isOwnerOrSuperAdmin = currentRole === 'org_owner' || currentRole === 'super_admin';
  const isAdmin = currentRole === 'admin' || isOwnerOrSuperAdmin;
  const canInvite = isAdmin; // staff cannot invite

  const pendingInvites = invites.filter(
    (i) => i.status === 'pending' && new Date(i.expiresAt).getTime() > Date.now()
  );

  const rows: Row[] = [
    ...users.map((u: OrgUser): Row => ({ _type: 'user', data: u })),
    ...pendingInvites.map((i): Row => ({ _type: 'invite', data: i })),
  ];

  function canEditUser(target: OrgUser): boolean {
    if (target.id === currentUser?.uid) return false;
    // Admin cannot edit owners; only owner/super_admin can
    if (target.role === 'org_owner' && !isOwnerOrSuperAdmin) return false;
    return isAdmin;
  }

  async function handleRevoke(invite: Invite) {
    setRevoking(invite.token);
    try {
      const res = await apiFetch(`/api/invites/${invite.token}/revoke`, { method: 'POST' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? 'Failed to revoke invite');
      }
      toast.success(`Invite for ${invite.email ?? invite.username} revoked.`);
      qc.invalidateQueries({ queryKey: ['invites'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke invite');
    } finally {
      setRevoking(null);
    }
  }

  function openEditRole(u: OrgUser) {
    setEditTarget(u);
    setEditRole(u.role);
  }

  async function handleSaveRole() {
    if (!editTarget) return;
    setSavingRole(true);
    try {
      const res = await apiFetch(`/api/users/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? 'Failed to update role');
      }
      toast.success('Role updated');
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setSavingRole(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { user: target, permanent } = deleteTarget;
    try {
      const url = permanent
        ? `/api/users/${target.id}?permanent=true`
        : `/api/users/${target.id}`;
      const res = await apiFetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? (permanent ? 'Failed to delete user' : 'Failed to deactivate user'));
      }
      toast.success(permanent
        ? `${target.displayName || target.email} deleted permanently`
        : `${target.displayName || target.email} deactivated`
      );
      qc.invalidateQueries({ queryKey: ['users'] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        actions={
          canInvite
            ? <Button size="sm" onClick={() => setShowInvite(true)}><PlusSVG /><span className="ml-1">Invite User</span></Button>
            : undefined
        }
      />

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email / Username</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined / Expires</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? '120px' : j === 1 ? '160px' : '80px' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">No users found.</td>
              </tr>
            ) : (
              rows.map((row) => {
                if (row._type === 'user') {
                  const u = row.data;
                  const editable = canEditUser(u);
                  return (
                    <tr key={`user-${u.id}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.displayName || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email || (u.username ? `@${u.username}` : '—')}</td>
                      <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                      <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {editable && (
                          <div className="flex items-center justify-end gap-1">
                            {u.status !== 'deactivated' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
                                  onClick={() => openEditRole(u)}
                                  title="Edit role"
                                >
                                  <EditSVG />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                                  onClick={() => setDeleteTarget({ user: u, permanent: false })}
                                  title="Deactivate user"
                                >
                                  <Trash2SVG />
                                </Button>
                              </>
                            )}
                            {u.status === 'deactivated' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => setDeleteTarget({ user: u, permanent: true })}
                                title="Delete permanently"
                              >
                                <Trash2SVG />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                }

                const inv = row.data;
                return (
                  <tr key={`invite-${inv.id}`} className="hover:bg-gray-50 transition-colors bg-amber-50/30">
                    <td className="px-4 py-3 font-medium text-gray-700">{inv.displayName || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.email || (inv.username ? `@${inv.username}` : '—')}</td>
                    <td className="px-4 py-3"><RoleBadge role={inv.role} /></td>
                    <td className="px-4 py-3"><StatusBadge status="pending" /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">Expires {formatDate(inv.expiresAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1"
                          disabled={revoking === inv.token}
                          onClick={() => handleRevoke(inv)}
                        >
                          <MailXSVG />
                          {revoking === inv.token ? 'Revoking…' : 'Revoke'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {canInvite && <InviteUserModal open={showInvite} onOpenChange={setShowInvite} />}

      {/* Edit role dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                User: <span className="font-medium text-gray-900">{editTarget?.displayName || editTarget?.email}</span>
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isOwnerOrSuperAdmin && (
                    <SelectItem value="org_owner">Owner</SelectItem>
                  )}
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={savingRole}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={savingRole || editRole === editTarget?.role}>
              {savingRole ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={deleteTarget?.permanent ? 'Delete User Permanently' : 'Deactivate User'}
        description={deleteTarget?.permanent
          ? `Permanently delete "${deleteTarget.user.displayName || deleteTarget.user.email}"? This cannot be undone.`
          : `Deactivate "${deleteTarget?.user.displayName || deleteTarget?.user.email}"? They will lose access immediately.`
        }
        confirmLabel={deleteTarget?.permanent ? 'Delete Permanently' : 'Deactivate'}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
