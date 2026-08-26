'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast, useT } from '@/hooks/ui';
import { createClient } from '@/lib/supabase/client';
import { Save, KeyRound } from 'lucide-react';

export default function SuperAdminProfilePage() {
  const { user, setUser } = useAuthStore();
  const { t } = useT();

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
      toast.success(t('profile.nameUpdated'));
    } catch {
      toast.error(t('profile.nameUpdateFailed'));
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('profile.passwordsDontMatch'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('profile.passwordMinLengthEight'));
      return;
    }
    setSavingPassword(true);
    try {
      if (!user?.email) throw new Error();
      const supabase = await createClient();
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) {
        toast.error(t('profile.currentIncorrect'));
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;
      toast.success(t('profile.passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error(t('profile.passwordUpdateFailed'));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div>
      <PageHeader title={t('profile.title')} />

      <div className="max-w-2xl space-y-6">
        <div className="bg-surface-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{t('profile.accountInfo')}</h2>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('common.email')}</label>
            <Input value={user?.email ?? ''} disabled />
          </div>
          <div className="mb-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('common.role')}</label>
            <Input value={user?.role?.replace(/_/g, ' ') ?? ''} disabled className="capitalize" />
          </div>
        </div>

        <div className="bg-surface-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{t('profile.displayName')}</h2>
          <form onSubmit={handleSaveName} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('profile.displayName')}</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t('profile.yourName')} required />
            </div>
            <Button type="submit" size="sm" disabled={savingName || !displayName.trim()}>
              <Save className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="ms-1">{savingName ? t('common.saving') : t('common.save')}</span>
            </Button>
          </form>
        </div>

        <div className="bg-surface-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">{t('profile.changePassword')}</h2>
          <p className="text-xs text-gray-400 mb-4">{t('profile.changePasswordHint')}</p>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('profile.currentPassword')}</label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t('profile.currentPasswordPlaceholder')} required autoComplete="current-password" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('profile.newPassword')}</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('profile.newPasswordPlaceholder')} required autoComplete="new-password" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('profile.confirmPassword')}</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('profile.confirmPlaceholder')} required autoComplete="new-password" />
            </div>
            <Button type="submit" size="sm" disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}>
              <KeyRound className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="ms-1">{savingPassword ? t('profile.updating') : t('profile.updatePassword')}</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
