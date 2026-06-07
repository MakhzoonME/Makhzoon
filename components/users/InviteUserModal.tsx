/* eslint-disable @next/next/no-img-element */
'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { inviteUserSchema, InviteUserFormData } from '@/lib/validations/user.schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/auth.store';
import { useSubscriptionFeatures } from '@/hooks/org';
import { PermissionsEditor } from './PermissionsEditor';
import { UserPermissions, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_STAFF_PERMISSIONS } from '@/types';

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

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserModal({ open, onOpenChange }: InviteUserModalProps) {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const features = useSubscriptionFeatures();
  const canInviteOwner = currentUser?.role === 'super_admin' || currentUser?.role === 'org_owner';
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_STAFF_PERMISSIONS);
  const [showPermissions, setShowPermissions] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteQR, setInviteQR] = useState<string | null>(null);
  const [inviteDelivered, setInviteDelivered] = useState(false);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [inviteUsername, setInviteUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteMode, setInviteMode] = useState<'email' | 'username'>('email');

  const form = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { email: '', username: '', displayName: '', role: 'staff' },
  });

  function handleClose() {
    setInviteLink(null);
    setInviteQR(null);
    setInviteDelivered(false);
    setInviteExpiresAt(null);
    setInviteUsername(null);
    setCopied(false);
    setPermissions(DEFAULT_STAFF_PERMISSIONS);
    setShowPermissions(false);
    setInviteMode('email');
    form.reset({ email: '', username: '', displayName: '', role: 'staff' });
    onOpenChange(false);
  }

  function handleInviteAnother() {
    setInviteLink(null);
    setInviteQR(null);
    setInviteDelivered(false);
    setInviteExpiresAt(null);
    setInviteUsername(null);
    setCopied(false);
    form.reset({ email: '', username: '', displayName: '', role: 'staff' });
    setPermissions(DEFAULT_STAFF_PERMISSIONS);
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

  function switchMode(mode: 'email' | 'username') {
    setInviteMode(mode);
    if (mode === 'email') {
      form.setValue('username', '');
    } else {
      form.setValue('email', '');
    }
  }

  function handleRoleChange(role: string) {
    form.setValue('role', role as InviteUserFormData['role']);
    setPermissions(defaultPermissionsForRole(role));
    setShowPermissions(false);
  }

  async function onSubmit(data: InviteUserFormData) {
    setLoading(true);
    try {
      const payload = {
        email: inviteMode === 'email' ? data.email?.trim() || undefined : undefined,
        username: inviteMode === 'username' ? data.username?.trim() || undefined : undefined,
        displayName: data.displayName,
        role: data.role,
        permissions,
      };
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(typeof e.error === 'string' ? e.error : 'Failed to invite user');
      }
      const result = await res.json();
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['invites'] });
      if (result.messageSent) {
        toast.success('Invite sent via email.');
      }
      setInviteLink(result.acceptUrl);
      setInviteQR(result.qrDataUrl ?? null);
      setInviteDelivered(!!result.messageSent);
      setInviteExpiresAt(result.expiresAt ?? null);
      setInviteUsername(result.username ?? null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setLoading(false);
    }
  }

  const emailValue = form.watch('email') ?? '';
  const usernameValue = form.watch('username') ?? '';
  const selectedRole = form.watch('role');
  const canSubmit = inviteMode === 'email' ? emailValue.trim().length > 0 : usernameValue.trim().length > 0;

  const permissionsLabel = selectedRole === 'staff'
    ? 'Staff has limited default access — customise below.'
    : 'All permissions enabled by default — customise below.';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>

        {inviteLink ? (
          <>
            <div className="px-6 py-5 space-y-4">
              {inviteDelivered ? (
                <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5" aria-hidden>
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" fill="none" />
                    <path d="M5 8.2l2 2 4-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p>Invitation sent via email. You can also share the link or QR code below.</p>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5" aria-hidden>
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" fill="none" />
                    <path d="M8 5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <div>
                    {inviteUsername ? (
                      <p>Username invite created. Share the link or QR code with <strong>{inviteUsername}</strong> so they can set their password.</p>
                    ) : (
                      <p>Email delivery is not configured. Share the link or QR code below manually.</p>
                    )}
                  </div>
                </div>
              )}

              {inviteQR && (
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-xl border border-border bg-surface-card p-3 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={inviteQR} alt="Invitation QR code" width={200} height={200} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => downloadQR(inviteQR)}>Download QR</Button>
                    <Button size="sm" variant="outline" onClick={() => copyLink(inviteLink)} className="gap-1.5">
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
                  value={inviteLink}
                  className="w-full text-xs font-mono bg-surface-page border border-border rounded px-3 py-2 text-gray-700 truncate focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  {inviteExpiresAt
                    ? `Expires ${new Date(inviteExpiresAt).toLocaleDateString()}.`
                    : 'This link expires in 7 days.'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleInviteAnother}>Invite Another</Button>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="px-6 py-5 space-y-4">
                {/* Invite mode toggle */}
                <div className="flex rounded-lg border border-border p-1 gap-1 bg-surface-page">
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

                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select onValueChange={handleRoleChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {canInviteOwner && <SelectItem value="org_owner">Owner</SelectItem>}
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Access permissions — shown for all roles */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowPermissions((v) => !v)}
                    className="flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                      <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
                      <path d="M4 7h6M7 4v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    {showPermissions ? 'Hide Access Permissions' : 'Set Access Permissions'}
                  </button>
                  {showPermissions ? (
                    <PermissionsEditor
                      value={permissions}
                      onChange={setPermissions}
                      availableFeatures={features}
                      showAllModules={selectedRole === 'org_owner' || selectedRole === 'admin'}
                    />
                  ) : (
                    <p className="text-xs text-gray-400">{permissionsLabel}</p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
                <Button type="submit" disabled={loading || !canSubmit}>
                  {loading ? 'Inviting...' : 'Send Invite'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { DEFAULT_STAFF_PERMISSIONS };
