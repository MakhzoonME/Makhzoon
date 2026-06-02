'use client';
import { useEffect, useState, use } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { AlertCircle, Loader2, ArrowRight, Check } from 'lucide-react';


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

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden bg-surface-page">
      {/* Dot-field background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(79,70,229,0.10) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          opacity: 0.7,
        }}
      />
      {children}
    </div>
  );
}

function InitialsAvatar({ name, muted = false }: { name: string; muted?: boolean }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full text-sm font-semibold select-none"
      style={{
        width: 36, height: 36,
        background: muted ? 'var(--gray-100)' : 'var(--primary-100)',
        color: muted ? 'var(--gray-500)' : 'var(--primary-700)',
        border: `1.5px solid ${muted ? 'var(--border-default)' : 'var(--primary-100)'}`,
      }}
    >
      {initials}
    </div>
  );
}

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
    const supabase = await createClient();
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
    // After accepting an invite, land on the org's Default space dashboard.
    // PR-3 will resolve the user's preferred space from session state.
    router.push(`/${locale}/${orgSlug}/default/dashboard`);
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
      <PageWrap>
        <div className="w-full animate-pulse space-y-3" style={{ maxWidth: 420 }}>
          <div className="h-12 w-12 rounded-full bg-gray-200 mx-auto" />
          <div className="h-5 w-48 bg-gray-200 rounded-lg mx-auto" />
          <div className="h-64 bg-gray-100 rounded-2xl mt-4" />
        </div>
      </PageWrap>
    );
  }

  /* ── Invite invalid / expired ─────────────────────────────────── */
  if (fetchError || !info) {
    return (
      <PageWrap>
        <div
          className="w-full bg-surface-card border border-border text-center"
          style={{ maxWidth: 420, borderRadius: 14, padding: 34, boxShadow: 'var(--shadow-lg)' }}
        >
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full mb-4"
            style={{ background: 'var(--red-50)', color: 'var(--red-700)' }}>
            <AlertCircle className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-1.5">Invite unavailable</h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">{fetchError || 'This invite link is invalid or has expired.'}</p>
          <Button onClick={() => router.push(`/${locale}/login`)} className="w-full">Go to sign in</Button>
        </div>
      </PageWrap>
    );
  }

  const isUsernameInvite = !info.email && !!info.username;
  const roleBadge = {
    bg: info.role === 'org_owner' ? '#ede9fe' : info.role === 'admin' ? 'var(--primary-100)' : 'var(--gray-100)',
    color: info.role === 'org_owner' ? '#6d28d9' : info.role === 'admin' ? 'var(--primary-700)' : 'var(--gray-600)',
  };

  return (
    <PageWrap>
      <div className="w-full" style={{ maxWidth: 420 }}>

        {/* Single card */}
        <div
          className="bg-surface-card border border-border"
          style={{ borderRadius: 14, boxShadow: 'var(--shadow-lg)', padding: 34 }}
        >
          {/* Logo — centered top */}
          <div className="flex justify-center mb-5">
            <MakhzoonMark size={42} radius={10} />
          </div>

          {/* Avatar pair — inviter → you */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <InitialsAvatar name={info.invitedByName} />
            <ArrowRight size={16} className="text-gray-300 flex-shrink-0" strokeWidth={1.75} />
            <InitialsAvatar name="You" muted />
          </div>

          {/* Headline */}
          <div className="text-center mb-5">
            <h1
              className="font-bold text-gray-900 mb-2"
              style={{ fontSize: 20, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}
            >
              You&apos;re invited to {info.orgName}
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              <span className="font-medium text-gray-700">{info.invitedByName}</span> invited you to join as{' '}
              <span
                className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: roleBadge.bg, color: roleBadge.color }}
              >
                {ROLE_LABEL[info.role] ?? info.role}
              </span>
              . Set a password to accept.
            </p>
          </div>

          {/* Pre-filled identity field */}
          <div className="mb-5">
            <Label>{isUsernameInvite ? 'Username' : 'Email'}</Label>
            <Input
              type={isUsernameInvite ? 'text' : 'email'}
              value={isUsernameInvite ? `@${info.username}` : info.email}
              disabled
              className="mt-1.5 opacity-60 cursor-not-allowed"
            />
          </div>

          {/* Username notice */}
          {isUsernameInvite && (
            <div className="mb-4 px-3 py-2.5 rounded-xl text-xs leading-relaxed"
              style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-100)', color: 'var(--blue-700)' }}>
              You&apos;ll sign in with username <strong>{info.username}</strong> and the password you set below.
            </div>
          )}

          {/* Password form */}
          <form onSubmit={handleAccept} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Create password</Label>
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
                placeholder="Repeat your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {formError && (
              <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm"
                style={{ background: 'var(--red-50)', border: '1px solid var(--red-100)', color: 'var(--red-700)' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>{formError}</span>
              </div>
            )}

            <Button type="submit" className="w-full gap-2" size="lg" disabled={submitting}>
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />Setting up account…</>
                : <><Check size={15} strokeWidth={2.2} />Accept &amp; join</>}
            </Button>
          </form>

          {/* Expiry note */}
          <p className="text-center text-xs text-gray-400 mt-4">
            This invite expires in 7 days.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-center gap-2">
          <MakhzoonMark size={18} />
          <span className="text-xs text-gray-400">Makhzoon · Secure invitation</span>
        </div>

      </div>
    </PageWrap>
  );
}
