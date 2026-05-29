'use client';
import { useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
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
import { Search } from 'lucide-react';

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
  super_admin:      'bg-[var(--purple-100)] text-[var(--purple-700)]',
  makhzoon_admin:   'bg-[var(--blue-100)] text-[var(--blue-700)]',
  makhzoon_support: 'bg-[var(--primary-100)] text-[var(--primary-700)]',
};

const ROLE_DESCRIPTION: Record<string, string> = {
  super_admin: 'Full access to all portal features. Can manage all team members.',
  makhzoon_admin: 'Broad access to manage organizations, support, and configuration. Cannot assign Super Admin role.',
  makhzoon_support: 'Configurable access to specific portal features.',
};

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let p = '';
  for (let i = 0; i < 14; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

function syncFiltersToUrl(pathname: string, params: Record<string, string>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return `${pathname}${qs.toString() ? '?' + qs.toString() : ''}`;
}

function sortMembers(members: TeamMember[], sortBy: string, sortDir: 'asc' | 'desc'): TeamMember[] {
  const sorted = [...members].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';
    switch (sortBy) {
      case 'name':
        aVal = a.displayName.toLowerCase();
        bVal = b.displayName.toLowerCase();
        break;
      case 'email':
        aVal = a.email.toLowerCase();
        bVal = b.email.toLowerCase();
        break;
      case 'role': {
        const order: Record<string, number> = { super_admin: 0, makhzoon_admin: 1, makhzoon_support: 2 };
        aVal = order[a.role] ?? 99;
        bVal = order[b.role] ?? 99;
        break;
      }
      case 'status':
        aVal = a.status === 'active' ? 0 : 1;
        bVal = b.status === 'active' ? 0 : 1;
        break;
      case 'created':
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
        break;
      default:
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
  });
  return sorted;
}

export default function SuperAdminTeamPage() {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuthStore();
  const qc = useQueryClient();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const search = searchParams.get('search') ?? '';
  const sortBy = searchParams.get('sortBy') ?? 'created';
  const sortDir = (searchParams.get('sortDir') === 'asc' ? 'asc' : searchParams.get('sortDir') === 'none' ? 'none' : 'desc') as 'asc' | 'desc' | 'none';

  const [searchInput, setSearchInput] = useState(search);

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

  const [editTarget, setEditTarget] = useState<TeamMember | null>(null);
  const [editForm, setEditForm] = useState({ displayName: '', role: 'makhzoon_support' as MakhzoonRole });
  const [editPermissions, setEditPermissions] = useState<SuperAdminPermissions>(DEFAULT_SUPPORT_PERMISSIONS);
  const [showEditPerms, setShowEditPerms] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: allMembers = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ['superadmin-team'],
    queryFn: async () => {
      const res = await fetch('/api/superadmin/team');
      if (!res.ok) throw new Error('Failed to load team');
      return res.json();
    },
  });

  const searchTerm = searchInput.toLowerCase();
  const filtered = allMembers.filter(
    (m) => !searchTerm || m.displayName.toLowerCase().includes(searchTerm) || m.email.toLowerCase().includes(searchTerm)
  );
  const sorted = sortDir === 'none' ? filtered : sortMembers(filtered, sortBy, sortDir);

  const updateUrl = useCallback((params: Record<string, string>) => {
    const url = syncFiltersToUrl(pathname, params);
    router.replace(url, { scroll: false });
  }, [pathname, router]);

  function syncAllToUrl(next: Partial<Record<'search' | 'sortBy' | 'sortDir', string>>) {
    updateUrl({
      search: next.search ?? search,
      sortBy: next.sortBy ?? sortBy,
      sortDir: next.sortDir ?? sortDir,
    });
  }

  function handleSortChange(nextSortBy: string, nextSortDir: 'asc' | 'desc' | 'none') {
    syncAllToUrl({ sortBy: nextSortBy, sortDir: nextSortDir === 'none' ? '' : nextSortDir });
  }

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
          <h1 className="text-xl font-bold text-gray-900">{t('team.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('team.subtitle')}</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="ms-1">{t('team.addMember')}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(['super_admin', 'makhzoon_admin', 'makhzoon_support'] as MakhzoonRole[]).map((role) => (
          <div key={role} className={cn('rounded-lg border px-4 py-3', ROLE_STYLE[role].replace('text-', 'border-').replace('bg-', 'bg-'))}>
            <p className={cn('text-xs font-semibold', ROLE_STYLE[role].split(' ')[1])}>{ROLE_LABEL[role]}</p>
            <p className="text-xs text-gray-500 mt-0.5">{ROLE_DESCRIPTION[role]}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface-card border border-border rounded-lg p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); syncAllToUrl({ search: e.target.value }); }}
            placeholder="Search by name or email"
            className="ps-8"
          />
        </div>
        {searchInput && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setSearchInput(''); syncAllToUrl({ search: '' }); }}
          >
            {t('orgs.clear')}
          </Button>
        )}
      </div>

      <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-page">
              {[
                { key: 'name', label: t('team.fullName'), width: '120px' },
                { key: 'email', label: t('team.email'), width: '160px' },
                { key: 'role', label: t('team.role'), width: '80px' },
                { key: 'status', label: t('team.status'), width: '80px' },
                { key: 'created', label: t('team.added'), width: '80px' },
              ].map(({ key, label }) => {
                const isCurrentSort = sortBy === key;
                const nextDir = isCurrentSort && sortDir === 'asc' ? 'desc' : isCurrentSort && sortDir === 'desc' ? 'none' : 'asc';
                return (
                  <th
                    key={key}
                    className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSortChange(key, nextDir)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      {isCurrentSort && sortDir !== 'none' ? (
                        <svg className="w-3 h-3 text-primary-600" viewBox="0 0 12 12" fill="none">
                          {sortDir === 'asc'
                            ? <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
                            : <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
                          }
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-gray-300" viewBox="0 0 12 12" fill="none">
                          <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
                          <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
                        </svg>
                      )}
                    </span>
                  </th>
                );
              })}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-surface-page rounded animate-pulse" style={{ width: j === 0 ? '120px' : j === 1 ? '160px' : '80px' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">{t('team.noResults')}</td>
              </tr>
            ) : (
              sorted.map((m) => {
                const isSelf = m.id === currentUser?.uid;
                const editable = canEdit(m);
                return (
                  <tr key={m.id} className="hover:bg-surface-page transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {m.displayName}
                      {isSelf && <span className="ms-2 text-xs text-gray-400">({t('team.you')})</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.email}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', ROLE_STYLE[m.role] ?? 'bg-surface-page text-gray-600')}>
                        {ROLE_LABEL[m.role] ?? m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize',
                        m.status === 'active' ? 'bg-[var(--green-100)] text-[var(--green-700)]' : 'bg-[var(--red-100)] text-[var(--red-700)]'
                      )}>
                        {m.status === 'active' ? t('status.active') : t('status.deactivated')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(new Date(m.createdAt))}</td>
                    <td className="px-4 py-3 text-end">
                      {editable && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-500 hover:text-primary-600 text-xs"
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

      <Dialog open={showAdd} onOpenChange={(o) => !o && setShowAdd(false)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('team.addMember')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 px-6 pt-4 pb-2">
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
                  className="pe-20"
                />
                <button
                  type="button"
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-xs text-primary-600 hover:text-primary-800"
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

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('team.editMember')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 pt-4 pb-2">
            <p className="text-xs text-gray-500">
              {t('users.editing')} <span className="font-medium text-gray-900">{editTarget?.email}</span>
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
