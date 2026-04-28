'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { inviteUserSchema, InviteUserFormData } from '@/lib/validations/user.schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/auth.store';

function CopySVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="4.5" y="4.5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M2.5 9.5H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h6.5a1 1 0 0 1 1 1v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

type Channel = 'email' | 'sms' | 'whatsapp';

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserModal({ open, onOpenChange }: InviteUserModalProps) {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const canInviteOwner = currentUser?.role === 'super_admin' || currentUser?.role === 'org_owner';
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteQR, setInviteQR] = useState<string | null>(null);
  const [inviteChannel, setInviteChannel] = useState<string>('email');
  const [inviteDelivered, setInviteDelivered] = useState(false);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { email: '', phone: '', channel: 'email', displayName: '', role: 'staff' },
  });

  const email = form.watch('email') ?? '';
  const phone = form.watch('phone') ?? '';
  const channel = form.watch('channel');

  const hasEmail = email.trim().length > 0;
  const hasPhone = phone.trim().length > 0;

  // Auto-select channel based on filled fields
  useEffect(() => {
    if (hasEmail && !hasPhone) {
      form.setValue('channel', 'email', { shouldValidate: false });
    } else if (!hasEmail && hasPhone) {
      // Auto-select whatsapp when phone is entered and email is empty
      if (channel === 'email') {
        form.setValue('channel', 'whatsapp', { shouldValidate: false });
      }
    } else if (hasEmail && hasPhone) {
      // Both filled: if currently on a phone-only channel and email just got filled, switch to email
      if (channel === 'sms' || channel === 'whatsapp') {
        form.setValue('channel', 'email', { shouldValidate: false });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasEmail, hasPhone]);

  // Per-channel disabled state
  const emailDisabled = !hasEmail;
  const smsDisabled = !hasPhone;
  const whatsappDisabled = !hasPhone;

  function handleClose() {
    setInviteLink(null);
    setInviteQR(null);
    setInviteDelivered(false);
    setInviteExpiresAt(null);
    setCopied(false);
    form.reset({ email: '', phone: '', channel: 'email', displayName: '', role: 'staff' });
    onOpenChange(false);
  }

  function handleInviteAnother() {
    setInviteLink(null);
    setInviteQR(null);
    setInviteDelivered(false);
    setInviteExpiresAt(null);
    setCopied(false);
    form.reset({ email: '', phone: '', channel: 'email', displayName: '', role: 'staff' });
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

  async function onSubmit(data: InviteUserFormData) {
    setLoading(true);
    try {
      const payload = {
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        channel: data.channel,
        displayName: data.displayName,
        role: data.role,
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
        const label =
          result.channel === 'whatsapp' ? 'WhatsApp' : result.channel === 'sms' ? 'SMS' : 'email';
        toast.success(`Invite sent via ${label}.`);
      }
      // Always show the confirmation screen with QR + link, regardless of delivery success.
      setInviteLink(result.acceptUrl);
      setInviteQR(result.qrDataUrl ?? null);
      setInviteChannel(result.channel);
      setInviteDelivered(!!result.messageSent);
      setInviteExpiresAt(result.expiresAt ?? null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setLoading(false);
    }
  }

  const fallbackLabel =
    inviteChannel === 'whatsapp'
      ? 'WhatsApp delivery failed'
      : inviteChannel === 'sms'
      ? 'SMS delivery failed'
      : 'Email delivery is not configured';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            {inviteDelivered ? (
              <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5" aria-hidden>
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" fill="none" />
                  <path d="M5 8.2l2 2 4-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p>Invitation sent. You can also share the link or QR code below.</p>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5" aria-hidden>
                  <path d="M8 2L1.5 13h13L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
                  <path d="M8 6.5v3M8 11v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <p>{fallbackLabel}. Share the link or QR code below manually.</p>
              </div>
            )}

            {inviteQR && (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={inviteQR} alt="Invitation QR code" width={200} height={200} />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadQR(inviteQR)}>
                    Download QR
                  </Button>
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
                className="w-full text-xs font-mono bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-700 truncate focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <p className="text-xs text-gray-400 mt-1.5">
                {inviteExpiresAt
                  ? `Expires ${new Date(inviteExpiresAt).toLocaleDateString()}.`
                  : 'This link expires in 7 days.'}
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleInviteAnother}>Invite Another</Button>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {/* Email */}
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email address
                    <span className="ml-1 text-gray-400 font-normal text-xs">(required if no phone)</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="email" {...field} placeholder="member@company.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Phone */}
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Phone number
                    <span className="ml-1 text-gray-400 font-normal text-xs">(required if no email)</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="tel" {...field} placeholder="+966501234567" />
                  </FormControl>
                  <p className="text-xs text-gray-400 mt-0.5">Include country code (e.g. +966 for Saudi Arabia)</p>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Channel selector */}
              <FormField control={form.control} name="channel" render={({ field }) => (
                <FormItem>
                  <FormLabel>Send invite via</FormLabel>
                  <div className="flex rounded-lg border border-gray-200 p-1 gap-1 bg-gray-50">
                    {(
                      [
                        { value: 'email', label: 'Email', disabled: emailDisabled },
                        { value: 'sms', label: 'SMS', disabled: smsDisabled },
                        { value: 'whatsapp', label: 'WhatsApp', disabled: whatsappDisabled },
                      ] as { value: Channel; label: string; disabled: boolean }[]
                    ).map(({ value, label, disabled }) => (
                      <button
                        key={value}
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && field.onChange(value)}
                        className={cn(
                          'flex-1 py-1.5 px-2 rounded-md text-sm font-medium transition-colors',
                          field.value === value && !disabled
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : disabled
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-500 hover:text-gray-700 cursor-pointer'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Display name */}
              <FormField control={form.control} name="displayName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl><Input {...field} placeholder="Jane Smith" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Role */}
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {canInviteOwner && <SelectItem value="org_owner">Org Owner</SelectItem>}
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
                <Button type="submit" disabled={loading || (!hasEmail && !hasPhone)}>
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
