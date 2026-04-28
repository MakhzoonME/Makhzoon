'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';
import { toast } from '@/hooks/useToast';
import { formatDate } from '@/lib/utils/date';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

type MakhzoonRole = 'super_admin' | 'makhzoon_admin' | 'makhzoon_support';

interface TeamMember {
  id: string;
  email: string;
  displayName: string;
  role: MakhzoonRole;
  status: 'active' | 'deactivated';
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
  const { user: currentUser } = useAuthStore();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ email: '', displayName: '', role: 'makhzoon_support' as MakhzoonRole, password: generatePassword() });
  const [showPassword, setShowPassword] = useState(false);
  const [editTarget, setEditTarget] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ['superadmin-team'],
    queryFn: async () => {
      const res = await fetch('/api/superadmin/team');
      if (!res.ok) throw new Error('Failed to load team');
      return res.json();
    },
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch('/api/superadmin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to add member');
      toast.success(`${form.displayName} added to the team.`);
      qc.invalidateQueries({ queryKey: ['superadmin-team'] });
      setShowAdd(false);
      setForm({ email: '', displayName: '', role: 'makhzoon_support', password: generatePassword() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveRole() {
    if (!editTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/team/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update role');
      toast.success('Role updated');
      qc.invalidateQueries({ queryKey: ['superadmin-team'] });
      setEditTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Makhzoon Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">Internal team members with superadmin access.</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}><PlusSVG /><span className="ml-1">Add Member</span></Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Added</th>
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
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">No team members found.</td>
              </tr>
            ) : (
              members.map((m) => {
                const isSelf = m.id === currentUser?.uid;
                const isSuperAdminMember = m.role === 'super_admin';
                return (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {m.displayName}
                      {isSelf && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.email}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', ROLE_STYLE[m.role] ?? 'bg-gray-100 text-gray-600')}>
                        {ROLE_LABEL[m.role] ?? m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize',
                        m.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      )}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(new Date(m.createdAt))}</td>
                    <td className="px-4 py-3 text-right">
                      {!isSelf && !isSuperAdminMember && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-500 hover:text-indigo-600 text-xs"
                            onClick={() => { setEditTarget(m); setEditRole(m.role); }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn('text-xs', m.status === 'active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50')}
                            onClick={() => handleDeactivate(m)}
                          >
                            {m.status === 'active' ? 'Deactivate' : 'Reactivate'}
                          </Button>
                          {isSuperAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
                              onClick={() => handleDelete(m)}
                            >
                              Delete
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tm-name">Full Name *</Label>
              <Input
                id="tm-name"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="Jane Smith"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-email">Email *</Label>
              <Input
                id="tm-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jane@makhzoon.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v as MakhzoonRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && <SelectItem value="makhzoon_admin">Makhzoon Admin</SelectItem>}
                  <SelectItem value="makhzoon_support">Makhzoon Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-password">Temporary Password *</Label>
              <div className="relative">
                <Input
                  id="tm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                  className="pr-20"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-indigo-600 hover:text-indigo-800"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-gray-400">Sent to the member by email. They should change it after first login.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)} disabled={adding}>Cancel</Button>
              <Button type="submit" disabled={adding}>{adding ? 'Adding…' : 'Add Member'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit role dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Member: <span className="font-medium text-gray-900">{editTarget?.displayName}</span>
            </p>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && <SelectItem value="makhzoon_admin">Makhzoon Admin</SelectItem>}
                  <SelectItem value="makhzoon_support">Makhzoon Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSaveRole} disabled={saving || editRole === editTarget?.role}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
