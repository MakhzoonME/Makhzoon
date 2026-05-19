'use client';
import { useEffect, useState, use } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { CheckCircle2, AlertCircle, User, Shield, Loader2, Mail, AtSign } from 'lucide-react';


type InviteInfo = {
  email?: string;
  username?: string;
  displayName: string;
  role: 'org_owner' | 'admin' | 'staff';
  orgName: string;
  invitedByName: string;
};

const ROLE_LABEL: Record<string, string> = {
  org_owner: 'Owner',
  admin: 'Admin',
  staff: 'Staff',
};

export default function AcceptInvitePage(props: { params: Promise<{ token: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const localeParams = useParams<{ locale: string }>();
  const locale = localeParams?.locale ?? 'en';
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    fetch(`/api/invites/${params.token}`)
      .then(async (res) => {
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error ?? 'Invite is invalid or expired');
        }
        return res.json();
      })
      .then((data) => setInfo(data))
      .catch((err) => setFetchError(err.message))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function finishSession(signInEmail: string, signInPassword: string) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });
    if (error) throw error;
    const sessionRes = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!sessionRes.ok) throw new Error('Session creation failed');
    const { orgSlug } = await sessionRes.json();
    if (!orgSlug) throw new Error('Your workspace could not be found. Please contact support.');
    router.push(`/${locale}/${orgSlug}/dashboard`);
  }

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (password.length < 8) return setFormError('Password must be at least 8 characters.');
    if (password !== confirm) return setFormError('Passwords do not match.');

    setSubmitting(true);
    try {
      const res = await fetch(`/api/invites/${params.token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to accept invite');

      // Sign in with email or synthetic username email
      const signInEmail = info?.email ?? (info?.username ? `${info.username}@makhzoon.local` : '');
      await finishSession(signInEmail, password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to accept invite');
      setSubmitting(false);
    }
  }

  /* ── Loading skeleton ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--surface-page)' }}>
        <div className="w-full max-w-md animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded-xl" />
          <div className="h-48 bg-surface-page rounded-2xl" />
        </div>
      </div>
    );
  }

  /* ── Invite invalid ───────────────────────────────────────────── */
  if (fetchError || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--surface-page)' }}>
        <div className="w-full max-w-md bg-surface-card rounded-2xl border border-border p-8 text-center shadow-sm">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--red-50)] mb-4 text-[var(--red-700)]">
            <AlertCircle className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-1.5">Invite unavailable</h1>
          <p className="text-sm text-gray-500 mb-6">{fetchError}</p>
          <Button onClick={() => router.push(`/${locale}/login`)} className="w-full">Go to sign in</Button>
        </div>
      </div>
    );
  }

  const isUsernameInvite = !info.email && !!info.username;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'var(--surface-page)' }}>
      <div className="w-full max-w-md">
        {/* Header card */}
        <div
          className="rounded-2xl p-7 mb-4 text-white text-center"
          style={{ background: 'linear-gradient(135deg, var(--primary-600) 0%, #7C3AED 100%)' }}
        >
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <CheckCircle2 className="h-5 w-5 text-white" strokeWidth={1.75} />
          </div>
          <h1 className="text-xl font-bold mb-1">Join {info.orgName}</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.78)' }}>
            {info.invitedByName} invited you to collaborate.
          </p>
        </div>

        {/* Info + form card */}
        <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
          {/* Invite details */}
          <div className="space-y-2.5 text-sm mb-6 pb-5 border-b border-border">
            <div className="flex items-center gap-2.5 text-gray-700">
              <span className="text-gray-400"><User className="h-3.5 w-3.5" strokeWidth={1.75} /></span>
              <span className="font-medium">{info.displayName}</span>
            </div>
            <div className="flex items-center gap-2.5 text-gray-700">
              <span className="text-gray-400">{isUsernameInvite ? <AtSign className="h-3.5 w-3.5" strokeWidth={1.75} /> : <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />}</span>
              <span>{isUsernameInvite ? `@${info.username}` : info.email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-gray-700">
              <span className="text-gray-400"><Shield className="h-3.5 w-3.5" strokeWidth={1.75} /></span>
              <span
                className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  background:
                    info.role === 'org_owner'
                      ? '#ede9fe'
                      : info.role === 'admin'
                      ? 'var(--primary-100)'
                      : 'var(--gray-100)',
                  color:
                    info.role === 'org_owner'
                      ? '#6d28d9'
                      : info.role === 'admin'
                      ? 'var(--primary-700)'
                      : 'var(--gray-600)',
                }}
              >
                {ROLE_LABEL[info.role] ?? info.role}
              </span>
            </div>
          </div>

          {isUsernameInvite && (
            <div className="mb-4 p-3 bg-[var(--blue-50)] border border-[var(--blue-100)] rounded-lg text-xs text-[var(--blue-700)]">
              You&apos;ll sign in with username <strong>{info.username}</strong> and the password you set below.
            </div>
          )}

          {/* Password form */}
          <form onSubmit={handleAccept} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Create a password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {formError && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[var(--red-700)] bg-[var(--red-50)] border border-[var(--red-100)]">
                <AlertCircle className="h-5 w-5" strokeWidth={1.75} />
                {formError}
              </div>
            )}
            <Button type="submit" className="w-full h-11" disabled={submitting}>
              {submitting ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />Setting up account…</span> : 'Accept invitation'}
            </Button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2">
            <MakhzoonMark size={20} />
            <span className="text-xs text-gray-500">Makhzoon · Secure invitation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
