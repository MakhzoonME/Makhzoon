'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';

/* ── Icons ────────────────────────────────────────────────────── */
function CheckCircleSVG() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="11" fill="white" fillOpacity="0.2" />
      <path d="M7 11l3 3 5-5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function AlertCircleSVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M10 6.5v4M10 12.5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function UserSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="5" r="3" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M1.5 13c0-3.038 2.462-5 5.5-5s5.5 1.962 5.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
function ContactSVG({ isUsername }: { isUsername: boolean }) {
  return isUsername ? (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M2 12.5c0-2.485 2.239-4.5 5-4.5s5 2.015 5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1" y="3" width="12" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M1 4.5l6 4 6-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function ShieldSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 1L2 3v4.5C2 10.1 4.3 12.5 7 13.2 9.7 12.5 12 10.1 12 7.5V3L7 1z" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M5 7l1.5 1.5 2.5-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SpinnerSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden className="animate-spin">
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M7.5 1.5a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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

export default function AcceptInvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
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
    const cred = await signInWithEmailAndPassword(auth, signInEmail, signInPassword);
    const token = await cred.user.getIdToken(true);
    const sessionRes = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });
    if (!sessionRes.ok) throw new Error('Session creation failed');
    const { orgSlug } = await sessionRes.json();
    router.push(orgSlug ? `/${orgSlug}/dashboard` : '/login');
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
          <div className="h-48 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  /* ── Invite invalid ───────────────────────────────────────────── */
  if (fetchError || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--surface-page)' }}>
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mb-4 text-red-500">
            <AlertCircleSVG />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-1.5">Invite unavailable</h1>
          <p className="text-sm text-gray-500 mb-6">{fetchError}</p>
          <Button onClick={() => router.push('/login')} className="w-full">Go to sign in</Button>
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
            <CheckCircleSVG />
          </div>
          <h1 className="text-xl font-bold mb-1">Join {info.orgName}</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.78)' }}>
            {info.invitedByName} invited you to collaborate.
          </p>
        </div>

        {/* Info + form card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {/* Invite details */}
          <div className="space-y-2.5 text-sm mb-6 pb-5 border-b border-gray-100">
            <div className="flex items-center gap-2.5 text-gray-700">
              <span className="text-gray-400"><UserSVG /></span>
              <span className="font-medium">{info.displayName}</span>
            </div>
            <div className="flex items-center gap-2.5 text-gray-700">
              <span className="text-gray-400"><ContactSVG isUsername={isUsernameInvite} /></span>
              <span>{isUsernameInvite ? `@${info.username}` : info.email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-gray-700">
              <span className="text-gray-400"><ShieldSVG /></span>
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
            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
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
              <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-700 bg-red-50 border border-red-100">
                <AlertCircleSVG />
                {formError}
              </div>
            )}
            <Button type="submit" className="w-full h-11" disabled={submitting}>
              {submitting ? <span className="inline-flex items-center gap-2"><SpinnerSVG />Setting up account…</span> : 'Accept invitation'}
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
