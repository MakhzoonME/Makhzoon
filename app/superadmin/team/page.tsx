'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';
import { toast } from '@/hooks/ui';
import { formatDate } from '@/lib/utils/date';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SuperAdminPermissionsEditor } from '@/components/super-admin/SuperAdminPermissionsEditor';
import {
  SuperAdminPermissions,
  DEFAULT_SUPER_ADMIN_PERMISSIONS,
  DEFAULT_MAKHZOON_ADMIN_PERMISSIONS,
  DEFAULT_SUPPORT_PERMISSIONS,
} from '@/types';
import { useT } from '@/hooks/ui';

function defaultPermsForRole(role: MakhzoonRole): SuperAdminPermissions {
  if (role === 'super_admin') return DEFAULT_SUPER_ADMIN_PERMISSIONS;
  if (role === 'makhzoon_admin') return DEFAULT_MAKHZOON_ADMIN_PERMISSIONS;
  return DEFAULT_SUPPORT_PERMISSIONS;
}

type MakhzoonRole = 'super_admin' | 'makhzoon_admin' | 'makhzoon_support';

interface TeamMember {
  id: string;
  email: string;
  displayName: string;
  role: MakhzoonRole;
  status: 'active' | 'deactivated';
  permissions?: SuperAdminPermissions;
  createdAt: string;
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  makhzoon_admin: 'Makhzoon Admin',
  makhzoon_support: 'Makhzoon Support',
};

const ROLE_STYLE: Record<string, string> = {
  super_admin: 'bg-violet-50 text-violet-700',
  makhzoon_admin: 'bg-blue-50 text-blue-700',
  makhzoon_support: 'bg-cyan-50 text-cyan-700',
};

const ROLE_DESCRIPTION: Record<string, string> = {
  super_admin: 'Full access to all portal features. Can manage all team members.',
  makhzoon_admin: 'Broad access to manage organizations, support, and configuration. Cannot assign Super Admin role.',
  makhzoon_support: 'Configurable access to specific portal features.',
};

function PlusSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let p = '';
  for (let i = 0; i < 14; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

export default function SuperAdminTeamPage() {
  const { t } = useT();
  const { user: currentUser } = useAuthStore();
  const qc = useQueryClient();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Add member dialog
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAddPerms, setShowAddPerms] = useState(false);
  const [addForm, setAddForm] = useState({
    email: '',
    displayName: '',
    role: 'makhzoon_support' as MakhzoonRole,
    password: generatePassword(),
  });
  const [addPermissions, setAddPermissions] = useState<SuperAdminPermissions>(DEFAULT_SUPPORT_PERMISSIONS);

  // Edit member dialog
  const [editTarget, setEditTarget] = useState<TeamMember | null>(null);
  const [editForm, setEditForm] = useState({ displayName: '', role: 'makhzoon_support' as MakhzoonRole });
  const [editPermissions, setEditPermissions] = useState<SuperAdminPermissions>(DEFAULT_SUPPORT_PERMISSIONS);
  const [showEditPerms, setShowEditPerms] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ['superadmin-team'],
    queryFn: async () => {
      const res = await fetch('/api/superadmin/team');
      if (!res.ok) throw new Error('Failed to load team');
      return res.json();
    },
  });

  function openAdd() {
    setAddForm({ email: '', displayName: '', role: 'makhzoon_support', password: generatePassword() });
    setAddPermissions(DEFAULT_SUPPORT_PERMISSIONS);
    setShowAddPerms(false);
    setShowPassword(false);
    setShowAdd(true);
  }

  function openEdit(m: TeamMember) {
    setEditTarget(m);
    setEditForm({ displayName: m.displayName, role: m.role });
    setEditPermissions(m.permissions ?? defaultPermsForRole(m.role));
    setShowEditPerms(false);
    setSaving(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const body: Record<string, unknown> = { ...addForm, permissions: addPermissions };
      const res = await fetch('/api/superadmin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to add member');
      toast.success(`${addForm.displayName} added to the team.`);
      qc.invalidateQueries({ queryKey: ['superadmin-team'] });
      setShowAdd(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { updatedBy: currentUser?.uid, permissions: editPermissions };
      if (editForm.displayName !== editTarget.displayName) body.displayName = editForm.displayName;
      if (editForm.role !== editTarget.role) body.role = editForm.role;

      const res = await fetch(`/api/superadmin/team/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update member');
      toast.success('Member updated');
      qc.invalidateQueries({ queryKey: ['superadmin-team'] });
      setEditTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update member');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(member: TeamMember) {
    const isActive = member.status === 'active';
    try {
      const res = await fetch(`/api/superadmin/team/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: isActive ? 'deactivated' : 'active' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update status');
      toast.success(isActive ? `${member.displayName} deactivated` : `${member.displayName} reactivated`);
      qc.invalidateQueries({ queryKey: ['superadmin-team'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function handleDelete(member: TeamMember) {
    if (!confirm(`Permanently delete ${member.displayName}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/superadmin/team/${member.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete');
      toast.success(`${member.displayName} deleted`);
      qc.invalidateQueries({ queryKey: ['superadmin-team'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  // Can the current user edit this member?
  function canEdit(m: TeamMember) {
    if (m.id === currentUser?.uid) return false;
    if (!isSuperAdmin && m.role === 'super_admin') return false;
    if (!isSuperAdmin && m.role === 'makhzoon_admin') return false;
    return true;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('team.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-0.5">{t('team.subtitle')}</p>
        </div>
        <Button size="sm" onClick={openAdd}><PlusSVG /><span className="ml-1">{t('team.addMember')}</span></Button>
      </div>

      {/* Role hierarchy info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(['super_admin', 'makhzoon_admin', 'makhzoon_support'] as MakhzoonRole[]).map((role) => (
          <div key={role} className={cn('rounded-lg border px-4 py-3', ROLE_STYLE[role].replace('text-', 'border-').replace('bg-', 'bg-'))}>
            <p className={cn('text-xs font-semibold', ROLE_STYLE[role].split(' ')[1])}>{ROLE_LABEL[role]}</p>
            <p className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">{ROLE_DESCRIPTION[role]}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('team.fullName')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('team.email')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('team.role')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('team.status')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('team.added')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? '120px' : j === 1 ? '160px' : '80px' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">{t('team.noResults')}</td>
              </tr>
            ) : (
              members.map((m) => {
                const isSelf = m.id === currentUser?.uid;
                const editable = canEdit(m);
                return (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {m.displayName}
                      {isSelf && <span className="ml-2 text-xs text-gray-400">({t('team.you')})</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{m.email}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', ROLE_STYLE[m.role] ?? 'bg-gray-100 text-gray-600')}>
                        {ROLE_LABEL[m.role] ?? m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize',
                        m.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      )}>
                        {m.status === 'active' ? t('status.active') : t('status.deactivated')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(new Date(m.createdAt))}</td>
                    <td className="px-4 py-3 text-right">
                      {editable && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-500 hover:text-indigo-600 text-xs"
                            onClick={() => openEdit(m)}
                          >
                            {t('common.edit')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn('text-xs', m.status === 'active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50')}
                            onClick={() => handleDeactivate(m)}
                          >
                            {m.status === 'active' ? t('team.deactivate') : t('team.reactivate')}
                          </Button>
                          {isSuperAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
                              onClick={() => handleDelete(m)}
                            >
                              {t('team.delete')}
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add member dialog */}
      <Dialog open={showAdd} onOpenChange={(o) => !o && setShowAdd(false)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('team.addMember')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tm-name">{t('team.fullName')} *</Label>
              <Input
                id="tm-name"
                value={addForm.displayName}
                onChange={(e) => setAddForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="Jane Smith"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-email">{t('team.email')} *</Label>
              <Input
                id="tm-email"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jane@makhzoon.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('team.role')} *</Label>
              <Select
                value={addForm.role}
                onValueChange={(v) => {
                  const role = v as MakhzoonRole;
                  setAddForm((f) => ({ ...f, role }));
                  setAddPermissions(defaultPermsForRole(role));
                  setShowAddPerms(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && <SelectItem value="super_admin">{t('role.superAdmin')}</SelectItem>}
                  {isSuperAdmin && <SelectItem value="makhzoon_admin">{t('role.makhzoonAdmin')}</SelectItem>}
                  <SelectItem value="makhzoon_support">{t('role.makhzoonSupport')}</SelectItem>
                </SelectContent>
              </Select>
              {addForm.role && (
                <p className="text-xs text-gray-400">{ROLE_DESCRIPTION[addForm.role]}</p>
              )}
            </div>

            {/* Access permissions — all roles */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowAddPerms((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-violet-700 hover:text-violet-800"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
                  <path d="M4 7h6M7 4v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                {showAddPerms ? t('invite.hidePermissions') : t('invite.setPermissions')}
              </button>
              {showAddPerms ? (
                <SuperAdminPermissionsEditor value={addPermissions} onChange={setAddPermissions} />
              ) : (
                <p className="text-xs text-gray-400">
                  {addForm.role === 'makhzoon_support'
                    ? t('permissions.default')
                    : t('permissions.defaultAdmin')}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tm-password">{t('team.tempPassword')} *</Label>
              <div className="relative">
                <Input
                  id="tm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={addForm.password}
                  onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                  className="pr-20"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-indigo-600 hover:text-indigo-800"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? t('team.hide') : t('team.show')}
                </button>
              </div>
              <p className="text-xs text-gray-400">{t('team.passwordHint')}</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)} disabled={adding}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={adding}>{adding ? t('team.adding') : t('team.addMember')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit member dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('team.editMember')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-xs text-gray-500 dark:text-gray-300">
              {t('users.editing')} <span className="font-medium text-gray-900 dark:text-gray-100">{editTarget?.email}</span>
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="edit-name">{t('team.fullName')}</Label>
              <Input
                id="edit-name"
                value={editForm.displayName}
                onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t('team.role')}</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => {
                  const role = v as MakhzoonRole;
                  setEditForm((f) => ({ ...f, role }));
                  setEditPermissions(defaultPermsForRole(role));
                  setShowEditPerms(false);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && <SelectItem value="super_admin">{t('role.superAdmin')}</SelectItem>}
                  {isSuperAdmin && <SelectItem value="makhzoon_admin">{t('role.makhzoonAdmin')}</SelectItem>}
                  <SelectItem value="makhzoon_support">{t('role.makhzoonSupport')}</SelectItem>
                </SelectContent>
              </Select>
              {editForm.role && (
                <p className="text-xs text-gray-400">{ROLE_DESCRIPTION[editForm.role]}</p>
              )}
            </div>

            {/* Access permissions — all roles */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowEditPerms((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-violet-700 hover:text-violet-800"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
                  <path d="M4 7h6M7 4v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                {showEditPerms ? t('permissions.hideAccess') : t('permissions.editAccess')}
              </button>
              {showEditPerms && (
                <SuperAdminPermissionsEditor value={editPermissions} onChange={setEditPermissions} />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? t('common.saving') : t('common.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
