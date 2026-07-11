'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useOrgSlug, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { PageHeader } from '@/components/shared/PageHeader';
import { AvatarUpload } from '@/components/shared/AvatarUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/ui';
import { createClient } from '@/lib/supabase/client';
import { Save, KeyRound } from 'lucide-react';

/** Display email/username without the synthetic @makhzoon.local suffix */
function displayIdentity(email?: string | null): string {
  if (!email) return '';
  return email.replace(/@makhzoon\.local$/i, '');
}


export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const orgSlug = useOrgSlug();
  const { t } = useT();
  const { data: orgData } = useOrgInfo();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);

  async function handleAvatarChange(url: string | null) {
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: url }),
      });
      if (!res.ok) throw new Error();
      if (user) setUser({ ...user, avatarUrl: url });
    } catch {
      toast.error(t('common.updateFailed'));
    }
  }

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
      toast.success(t('common.updated'));
    } catch {
      toast.error(t('common.updateFailed'));
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
    if (newPassword.length < 6) {
      toast.error(t('profile.passwordMinLength'));
      return;
    }
    setSavingPassword(true);
    try {
      if (!user?.email) throw new Error();
      const supabase = await createClient();
      // Re-authenticate by verifying the current password (Supabase has no
      // explicit reauthenticate-with-credential; a successful sign-in with the
      // current password serves the same purpose).
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
      toast.success(t('common.updated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error(t('common.updateFailed'));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div>
      <PageHeader title={t('common.profile')} />

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-surface-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{t('profile.accountInfo')}</h2>
          <div className="mb-6">
            <AvatarUpload
              value={user?.avatarUrl ?? null}
              onChange={handleAvatarChange}
              fallbackText={user?.displayName || user?.email || '?'}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('profile.username')}</label>
              <Input value={displayIdentity(user?.email)} disabled />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('profile.company')}</label>
              <Input value={orgData?.name ?? (orgSlug ?? '')} disabled />
            </div>
          </div>
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
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{t('profile.changePassword')}</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('profile.currentPassword')}</label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t('profile.currentPassword')} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('profile.newPassword')}</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('profile.newPasswordHint')} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('profile.confirmPassword')}</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('profile.confirmHint')} required />
            </div>
            <Button type="submit" size="sm" disabled={savingPassword}>
              <KeyRound className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="ms-1">{savingPassword ? t('profile.updating') : t('profile.updatePassword')}</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
