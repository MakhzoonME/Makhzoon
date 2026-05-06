'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/ui';
import { auth } from '@/lib/firebase/client';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Save, KeyRound } from 'lucide-react';

export default function SuperAdminProfilePage() {
  const { user, setUser } = useAuthStore();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) throw new Error();
      if (user) setUser({ ...user, displayName });
      toast.success('Name updated');
    } catch {
      toast.error('Failed to update name');
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSavingPassword(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !user?.email) throw new Error();
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error('Current password is incorrect');
      } else {
        toast.error('Failed to update password');
      }
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div>
      <PageHeader title="My Profile" />

      <div className="max-w-2xl space-y-6">
        <div className="bg-surface-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Account Info</h2>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <Input value={user?.email ?? ''} disabled />
          </div>
          <div className="mb-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
            <Input value={user?.role?.replace(/_/g, ' ') ?? ''} disabled className="capitalize" />
          </div>
        </div>

        <div className="bg-surface-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Display Name</h2>
          <form onSubmit={handleSaveName} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" required />
            </div>
            <Button type="submit" size="sm" disabled={savingName || !displayName.trim()}>
              <Save className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="ml-1">{savingName ? 'Saving...' : 'Save'}</span>
            </Button>
          </form>
        </div>

        <div className="bg-surface-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Change Password</h2>
          <p className="text-xs text-gray-400 mb-4">You will need to re-enter your current password to confirm.</p>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" required autoComplete="current-password" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 8 characters)" required autoComplete="new-password" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" required autoComplete="new-password" />
            </div>
            <Button type="submit" size="sm" disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}>
              <KeyRound className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="ml-1">{savingPassword ? 'Updating...' : 'Update Password'}</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
