'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { inviteUserSchema, InviteUserFormData } from '@/lib/validations/user.schema';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserAccessForm, type SpaceAccessValue } from '@/components/users/UserAccessForm';
import { toast, useT, useOrgSlug, useAdminGuard } from '@/hooks/ui';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/auth.store';
import { DEFAULT_ADMIN_PERMISSIONS, DEFAULT_STAFF_PERMISSIONS } from '@/types';
import type { UserPermissions } from '@/types';

function CopySVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="4.5" y="4.5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M2.5 9.5H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h6.5a1 1 0 0 1 1 1v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function defaultPermissionsForRole(role: string): UserPermissions {
  if (role === 'org_owner' || role === 'admin') return DEFAULT_ADMIN_PERMISSIONS;
  return DEFAULT_STAFF_PERMISSIONS;
}

interface InviteResult {
  acceptUrl: string;
  qrDataUrl: string | null;
  messageSent: boolean;
  expiresAt: string | null;
  username: string | null;
}

export default function InviteUserPage() {
  const { isAllowed } = useAdminGuard('settingsUsers.invite');
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { t, locale } = useT();
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const features = currentUser?.features ?? {};
  const canInviteOwner = currentUser?.role === 'super_admin' || currentUser?.role === 'org_owner';

  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_STAFF_PERMISSIONS);
  const [spaceAccess, setSpaceAccess] = useState<SpaceAccessValue>({ allSpaces: false, spaceIds: [] });
  const [inviteMode, setInviteMode] = useState<'email' | 'username'>('email');
  const [result, setResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { email: '', username: '', displayName: '', role: 'staff' },
  });

  function switchMode(mode: 'email' | 'username') {
    setInviteMode(mode);
    if (mode === 'email') form.setValue('username', '');
    else form.setValue('email', '');
  }

  function handleRoleChange(role: string) {
    form.setValue('role', role as InviteUserFormData['role']);
    setPermissions(defaultPermissionsForRole(role));
    setSpaceAccess({ allSpaces: role === 'org_owner', spaceIds: [] });
  }

  function downloadQR(dataUrl: string) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `makhzoon-invite-qr-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function inviteAnother() {
    setResult(null);
    setCopied(false);
    form.reset({ email: '', username: '', displayName: '', role: 'staff' });
    setPermissions(DEFAULT_STAFF_PERMISSIONS);
    setSpaceAccess({ allSpaces: false, spaceIds: [] });
    setInviteMode('email');
  }

  async function onSubmit(data: InviteUserFormData) {
    setLoading(true);
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteMode === 'email' ? data.email?.trim() || undefined : undefined,
          username: inviteMode === 'username' ? data.username?.trim() || undefined : undefined,
          displayName: data.displayName,
          role: data.role,
          permissions,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(typeof e.error === 'string' ? e.error : 'Failed to invite user');
      }
      const body = await res.json();
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['invites'] });
      if (body.messageSent) toast.success('Invite sent via email.');
      setResult({
        acceptUrl: body.acceptUrl,
        qrDataUrl: body.qrDataUrl ?? null,
        messageSent: !!body.messageSent,
        expiresAt: body.expiresAt ?? null,
        username: body.username ?? null,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setLoading(false);
    }
  }

  if (!isAllowed) return <div className="flex items-center justify-center h-48"><div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>;

  const emailValue = form.watch('email') ?? '';
  const usernameValue = form.watch('username') ?? '';
  const selectedRole = form.watch('role');
  const canSubmit = inviteMode === 'email' ? emailValue.trim().length > 0 : usernameValue.trim().length > 0;

  const roleOptions = [
    ...(canInviteOwner ? [{ value: 'org_owner', label: t('role.orgOwner') }] : []),
    { value: 'admin', label: t('role.admin') },
    { value: 'staff', label: t('role.staff') },
  ];

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Invite Team Member"
        breadcrumb={[
          { label: t('nav.users'), href: `/${locale}/${orgSlug}/users` },
          { label: 'Invite' },
        ]}
      />

      <Card>
        <CardContent className="p-6">
          {result ? (
            <div className="space-y-4">
              {result.messageSent ? (
                <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5" aria-hidden>
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" fill="none" />
                    <path d="M5 8.2l2 2 4-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p>Invitation sent via email. You can also share the link or QR code below.</p>
                </div>
              ) : inviteMode === 'email' ? (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5" aria-hidden>
                    <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <div className="flex-1">
                    <p>Email could not be delivered. Copy the link below and share it manually.</p>
                    <Button size="sm" variant="outline" onClick={() => copyLink(result.acceptUrl)} className="mt-2 gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100">
                      <CopySVG />
                      {copied ? 'Copied!' : 'Copy Link'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5" aria-hidden>
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" fill="none" />
                    <path d="M8 5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <p>Username invite created. Share the link or QR code with <strong>{result.username}</strong> so they can set their password.</p>
                </div>
              )}

              {result.qrDataUrl && (
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-xl border border-border bg-surface-card p-3 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={result.qrDataUrl} alt="Invitation QR code" width={200} height={200} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => downloadQR(result.qrDataUrl!)}>Download QR</Button>
                    <Button size="sm" variant="outline" onClick={() => copyLink(result.acceptUrl)} className="gap-1.5">
                      <CopySVG />
                      {copied ? 'Copied!' : 'Copy Link'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 text-center">Scan with a phone camera to open the invitation.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Invite Link</label>
                <input
                  readOnly
                  value={result.acceptUrl}
                  className="w-full text-xs font-mono bg-surface-page border border-border rounded px-3 py-2 text-gray-700 truncate focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  {result.expiresAt
                    ? `Expires ${new Date(result.expiresAt).toLocaleDateString()}.`
                    : 'This link expires in 7 days.'}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={inviteAnother}>Invite Another</Button>
                <Button onClick={() => router.push(`/${locale}/${orgSlug}/users`)}>Done</Button>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex rounded-lg border border-border p-1 gap-1 bg-surface-page max-w-sm">
                  <button type="button" onClick={() => switchMode('email')} className={cn('flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors', inviteMode === 'email' ? 'bg-surface-card text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 cursor-pointer')}>
                    Email invite
                  </button>
                  <button type="button" onClick={() => switchMode('username')} className={cn('flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors', inviteMode === 'username' ? 'bg-surface-card text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 cursor-pointer')}>
                    Username invite
                  </button>
                </div>

                {inviteMode === 'email' && (
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address *</FormLabel>
                      <FormControl><Input type="email" {...field} placeholder="member@company.com" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                {inviteMode === 'username' && (
                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username *</FormLabel>
                      <FormControl><Input {...field} placeholder="jane_smith" autoCapitalize="none" autoCorrect="off" /></FormControl>
                      <p className="text-xs text-gray-400 mt-0.5">3–30 lowercase letters, numbers, or underscores.</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="displayName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl><Input {...field} placeholder="Jane Smith" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <UserAccessForm
                  role={selectedRole}
                  onRoleChange={handleRoleChange}
                  roleOptions={roleOptions}
                  permissions={permissions}
                  onPermissionsChange={setPermissions}
                  spaceAccess={spaceAccess}
                  onSpaceAccessChange={setSpaceAccess}
                  availableFeatures={features}
                />

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/${orgSlug}/users`)} disabled={loading}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={loading || !canSubmit}>
                    {loading ? 'Inviting...' : 'Invite Team Member'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
