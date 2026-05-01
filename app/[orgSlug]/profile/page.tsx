'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { useT } from '@/hooks/useT';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/useToast';
import { storage } from '@/lib/firebase/client';
import { auth } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

function CameraSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><circle cx="8" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M5.5 4l1-2h3l1 2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>; }
function SaveSVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><rect x="2" y="2" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M5 2v3h4V2M4 9h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function KeySVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><circle cx="5.5" cy="7" r="3" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M8 6.5h4.5M10.5 6.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const orgSlug = useOrgSlug();
  const { data: orgData } = useQuery({
    queryKey: ['org-by-slug', orgSlug],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/by-subdomain/${orgSlug}`);
      if (!res.ok) return null;
      return res.json() as Promise<{ name: string }>;
    },
    enabled: !!orgSlug,
    staleTime: 60_000,
  });

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = (user?.displayName || user?.email || '?').slice(0, 2).toUpperCase();

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      const task = uploadBytesResumable(storageRef, file);
      await new Promise<void>((resolve, reject) => {
        task.on('state_changed',
          (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          resolve,
        );
      });
      const photoURL = await getDownloadURL(storageRef);
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoURL }),
      });
      if (!res.ok) throw new Error();
      setUser({ ...user, photoURL } as typeof user & { photoURL: string });
      toast.success('Avatar updated');
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

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
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
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

  const photoURL = (user as (typeof user & { photoURL?: string }) | null)?.photoURL;

  const { t } = useT();

  return (
    <div>
      <PageHeader title={t('nav.profile')} />

      <div className="max-w-2xl space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Avatar</h2>
          <div className="flex items-center gap-4">
            <div
              className="relative w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {photoURL ? (
                <Image src={photoURL} alt="Avatar" fill className="object-cover" unoptimized />
              ) : (
                <span className="text-indigo-700 font-semibold text-lg">{initials}</span>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <CameraSVG />
              </div>
            </div>
            <div>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? `Uploading ${uploadProgress}%` : 'Change Photo'}
              </Button>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Account Info</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <Input value={user?.email ?? ''} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
              <Input value={orgData?.name ?? ''} disabled className="bg-gray-50" />
            </div>
          </div>
          <form onSubmit={handleSaveName} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" required />
            </div>
            <Button type="submit" size="sm" disabled={savingName || !displayName.trim()}>
              <SaveSVG />
              <span className="ml-1">{savingName ? 'Saving...' : 'Save'}</span>
            </Button>
          </form>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required />
            </div>
            <Button type="submit" size="sm" disabled={savingPassword}>
              <KeySVG />
              <span className="ml-1">{savingPassword ? 'Updating...' : 'Update Password'}</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
