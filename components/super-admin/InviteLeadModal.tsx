'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/hooks/ui';
import { PermissionsEditor } from '@/components/users/PermissionsEditor';
import { UserPermissions, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_STAFF_PERMISSIONS } from '@/types';
import { useSubscriptionFeatures } from '@/hooks/org';

const inviteLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100).optional(),
  lastName: z.string().min(1, 'Last name is required').max(100).optional(),
  orgId: z.string().min(1, 'Please select an organization'),
  role: z.enum(['admin', 'staff']),
});

type InviteLeadFormData = z.infer<typeof inviteLeadSchema>;

function CopySVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="4.5" y="4.5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M2.5 9.5H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h6.5a1 1 0 0 1 1 1v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function defaultPermissionsForRole(role: string): UserPermissions {
  if (role === 'admin') return DEFAULT_ADMIN_PERMISSIONS;
  return DEFAULT_STAFF_PERMISSIONS;
}

interface InviteLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadEmail: string;
  leadName?: string;
}

export function InviteLeadModal({ open, onOpenChange, leadEmail, leadName }: InviteLeadModalProps) {
  const features = useSubscriptionFeatures();
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_STAFF_PERMISSIONS);
  const [showPermissions, setShowPermissions] = useState(false);
  const [result, setResult] = useState<{ acceptUrl: string; qrDataUrl?: string; expiresAt: string; messageSent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: orgs } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['superadmin-orgs-for-invite'],
    queryFn: async () => {
      const res = await fetch('/api/superadmin/invite');
      if (!res.ok) throw new Error('Failed to fetch organizations');
      return res.json();
    },
    staleTime: 60_000,
  });

  const form = useForm<InviteLeadFormData>({
    resolver: zodResolver(inviteLeadSchema),
    defaultValues: { firstName: '', lastName: '', orgId: '', role: 'staff' },
  });

  function handleClose() {
    setResult(null);
    setPermissions(DEFAULT_STAFF_PERMISSIONS);
    setShowPermissions(false);
    setCopied(false);
    form.reset({ firstName: '', lastName: '', orgId: '', role: 'staff' });
    onOpenChange(false);
  }

  function handleInviteAnother() {
    setResult(null);
    setPermissions(DEFAULT_STAFF_PERMISSIONS);
    setCopied(false);
  }

  function handleRoleChange(role: string) {
    form.setValue('role', role as InviteLeadFormData['role']);
    setPermissions(defaultPermissionsForRole(role));
    setShowPermissions(false);
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function downloadQR(dataUrl: string) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `makhzoon-invite-qr-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function onSubmit(data: InviteLeadFormData) {
    setLoading(true);
    try {
      const combinedName = [data.firstName, data.lastName].filter(Boolean).join(' ') || leadName || leadEmail;
      const payload = {
        orgId: data.orgId,
        email: leadEmail,
        displayName: combinedName,
        role: data.role,
        permissions,
      };
      const res = await fetch('/api/superadmin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(typeof e.error === 'string' ? e.error : 'Failed to send invite');
      }
      const json = await res.json();
      setResult({ acceptUrl: json.acceptUrl, qrDataUrl: json.qrDataUrl, expiresAt: json.expiresAt, messageSent: json.messageSent });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  }

  const selectedRole = form.watch('role');
  const permissionsLabel = selectedRole === 'staff'
    ? 'Staff has limited default access — customise below.'
    : 'All permissions enabled by default — customise below.';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite to Organization</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 px-6 pt-4">
            {result.messageSent ? (
              <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5" aria-hidden>
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" fill="none" />
                  <path d="M5 8.2l2 2 4-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p>Invitation sent to <strong>{leadEmail}</strong>. You can also share the link or QR code below.</p>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5" aria-hidden>
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" fill="none" />
                  <path d="M8 5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <p>Email delivery is not configured. Share the link or QR code manually.</p>
              </div>
            )}

            {result.qrDataUrl && (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="rounded-xl border border-border bg-surface-card p-3 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.qrDataUrl} alt="Invitation QR code" width={200} height={200} />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadQR(result!.qrDataUrl!)}>Download QR</Button>
                  <Button size="sm" variant="outline" onClick={() => copyLink(result!.acceptUrl)} className="gap-1.5">
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
                Expires {new Date(result.expiresAt).toLocaleDateString()}.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleInviteAnother}>Invite Another</Button>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6 pt-4 pb-2">
              <div className="rounded-lg border border-border bg-surface-page p-3 mb-2">
                <p className="text-xs text-gray-500 mb-1">Inviting</p>
                <p className="font-medium text-sm text-gray-900">{leadEmail}</p>
                {leadName && <p className="text-xs text-gray-400 mt-0.5">{leadName}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input {...field} placeholder="Jane" autoCapitalize="words" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl><Input {...field} placeholder="Smith" autoCapitalize="words" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="orgId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select organization..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {orgs?.map((org) => (
                        <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select onValueChange={handleRoleChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

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
                  <PermissionsEditor value={permissions} onChange={setPermissions} availableFeatures={features} />
                ) : (
                  <p className="text-xs text-gray-400">{permissionsLabel}</p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
                <Button type="submit" disabled={loading || !orgs}>
                  {loading ? 'Sending...' : 'Send Invite'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}