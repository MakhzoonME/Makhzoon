'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
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
function ContactSVG({ isPhone }: { isPhone: boolean }) {
  return isPhone ? (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M4 1.5h2.5l1 2.5-1.5 1a8 8 0 0 0 3 3l1-1.5 2.5 1V10a1 1 0 0 1-1 1C4.716 11 1 7.284 1 2.5a1 1 0 0 1 1-1h2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
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
  phone?: string;
  phoneDisplay?: string;
  channel: string;
  displayName: string;
  role: 'admin' | 'staff';
  orgName: string;
  invitedByName: string;
};

export default function AcceptInvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Email/password fields
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // Phone OTP fields
  const [otpStep, setOtpStep] = useState<'send' | 'verify'>('send');
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

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

  async function finishSession(idToken: string) {
    const sessionRes = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!sessionRes.ok) throw new Error('Session creation failed');
    const { orgSlug } = await sessionRes.json();
    router.push(orgSlug ? `/${orgSlug}/dashboard` : '/login');
  }

  /* ── Email + password flow ──────────────────────────────────── */
  async function handleEmailAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!info?.email) return;
    setFormError('');
    if (password.length < 8) return setFormError('Password must be at least 8 characters.');
    if (password !== confirm) return setFormError('Passwords do not match.');

    setSubmitting(true);
    try {
      const res = await fetch(`/api/invites/${params.token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'password', password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to accept invite');

      const cred = await signInWithEmailAndPassword(auth, info.email, password);
      const token = await cred.user.getIdToken(true);
      await finishSession(token);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to accept invite');
      setSubmitting(false);
    }
  }

  /* ── Phone OTP flow ─────────────────────────────────────────── */
  async function handleSendOtp() {
    if (!info?.phone) return;
    setSendingOtp(true);
    setFormError('');
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-anchor', { size: 'invisible' });
        await recaptchaRef.current.render();
      }
      confirmationRef.current = await signInWithPhoneNumber(auth, info.phone, recaptchaRef.current);
      setOtpStep('verify');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to send verification code');
      recaptchaRef.current = null;
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmationRef.current) return;
    setFormError('');
    setSubmitting(true);
    try {
      const cred = await confirmationRef.current.confirm(otp);
      const idToken = await cred.user.getIdToken();

      const res = await fetch(`/api/invites/${params.token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'phone', idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to accept invite');

      // Re-fetch token with fresh custom claims
      const freshToken = await cred.user.getIdToken(true);
      await finishSession(freshToken);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setFormError(msg.includes('invalid-verification-code') ? 'Incorrect code. Please try again.' : msg);
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

  const isPhoneInvite = !info.email && !!info.phone;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'var(--surface-page)' }}>
      {/* Invisible reCAPTCHA anchor for Firebase Phone Auth */}
      <div id="recaptcha-anchor" />

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
              <span className="text-gray-400"><ContactSVG isPhone={isPhoneInvite} /></span>
              <span>{isPhoneInvite ? info.phoneDisplay : info.email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-gray-700">
              <span className="text-gray-400"><ShieldSVG /></span>
              <span className="capitalize">{info.role}</span>
              <span
                className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: info.role === 'admin' ? 'var(--primary-100)' : 'var(--gray-100)',
                  color: info.role === 'admin' ? 'var(--primary-700)' : 'var(--gray-600)',
                }}
              >
                {info.role}
              </span>
            </div>
          </div>

          {/* Email/password form */}
          {!isPhoneInvite && (
            <form onSubmit={handleEmailAccept} className="space-y-4">
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
          )}

          {/* Phone OTP form */}
          {isPhoneInvite && (
            <div className="space-y-4">
              {otpStep === 'send' ? (
                <>
                  <p className="text-sm text-gray-600">
                    We&apos;ll send a verification code to your phone number ending in{' '}
                    <strong>{info.phoneDisplay?.slice(-4)}</strong>.
                  </p>
                  {formError && (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-700 bg-red-50 border border-red-100">
                      <AlertCircleSVG />
                      {formError}
                    </div>
                  )}
                  <Button className="w-full h-11" onClick={handleSendOtp} disabled={sendingOtp}>
                    {sendingOtp ? <span className="inline-flex items-center gap-2"><SpinnerSVG />Sending code…</span> : 'Send verification code'}
                  </Button>
                </>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Enter the 6-digit code sent to{' '}
                    <strong>{info.phoneDisplay}</strong>.
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="otp">Verification code</Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                  {formError && (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-700 bg-red-50 border border-red-100">
                      <AlertCircleSVG />
                      {formError}
                    </div>
                  )}
                  <Button type="submit" className="w-full h-11" disabled={submitting || otp.length < 6}>
                    {submitting ? <span className="inline-flex items-center gap-2"><SpinnerSVG />Verifying…</span> : 'Verify & join workspace'}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                    onClick={() => { setOtpStep('send'); setOtp(''); setFormError(''); confirmationRef.current = null; recaptchaRef.current = null; }}
                  >
                    Didn&apos;t receive a code? Try again
                  </button>
                </form>
              )}
            </div>
          )}
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
