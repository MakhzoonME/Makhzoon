'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { buildOrgPath, buildSuperAdminPath } from '@/lib/utils/tenant-url';
import { cn } from '@/lib/utils/cn';

/* ── Icons ────────────────────────────────────────────────────── */
function EyeSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M1.5 8s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5z" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
function EyeOffSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5M4.5 4.6C2.8 5.7 1.5 8 1.5 8s2.5 5 6.5 5c1.3 0 2.5-.4 3.5-1M7 3.1C7.3 3 7.7 3 8 3c4 0 6.5 5 6.5 5a12 12 0 0 1-1.5 2.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function Loader2SVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="animate-spin">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function AlertCircleSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M8 5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function MailSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1" y="3" width="12" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M1 4.5l6 4 6-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function PhoneSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M4 1.5h2.5l1 2.5-1.5 1a8 8 0 0 0 3 3l1-1.5 2.5 1V10a1 1 0 0 1-1 1C4.716 11 1 7.284 1 2.5a1 1 0 0 1 1-1h2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
function CheckCircleSVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="10" fill="white" fillOpacity="0.18" />
      <path d="M6 10l3 3 5-5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const;

type PendingInvite = {
  inviteToken: string;
  orgName: string;
  role: string;
  displayName: string;
  invitedByName: string;
};

export default function LoginPage() {
  const router = useRouter();
  const shakeControls = useAnimation();

  const [tab, setTab] = useState<'email' | 'phone'>('email');

  // Email/password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Phone OTP
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<'enter' | 'verify'>('enter');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const idTokenRef = useRef<string | null>(null);

  // Pending invite (lazy acceptance)
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const [acceptError, setAcceptError] = useState('');

  function shake() {
    shakeControls.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.4, ease: 'easeInOut' } });
  }

  async function redirectFromSession(idToken: string) {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Session creation failed');

    // Server detected this is a first-time phone user with a pending invite
    if (body.needsInviteAccept) {
      setPendingInvite(body as PendingInvite);
      return;
    }

    const { role, orgSlug } = body;
    if (role === 'super_admin') {
      router.push(buildSuperAdminPath('/dashboard'));
    } else if (orgSlug) {
      router.push(buildOrgPath(orgSlug, '/dashboard'));
    } else {
      router.push('/');
    }
  }

  /* ── Email/password submit ───────────────────────────────────── */
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError('');
    setEmailLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      await redirectFromSession(token);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      const isFirebaseAuth = msg.startsWith('Firebase') || /auth\//.test(msg);
      setEmailError(isFirebaseAuth ? 'Invalid email or password' : msg);
      shake();
      setEmailLoading(false);
    }
  }

  /* ── Phone: send OTP ─────────────────────────────────────────── */
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError('');
    if (!phone.startsWith('+')) {
      setPhoneError('Include your country code, e.g. +966501234567');
      shake();
      return;
    }
    setSendingOtp(true);
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-login', { size: 'invisible' });
        await recaptchaRef.current.render();
      }
      confirmationRef.current = await signInWithPhoneNumber(auth, phone, recaptchaRef.current);
      setPhoneStep('verify');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send code';
      setPhoneError(/auth\/invalid-phone-number/.test(msg) ? 'Invalid phone number format.' : msg);
      shake();
      recaptchaRef.current = null;
    } finally {
      setSendingOtp(false);
    }
  }

  /* ── Phone: verify OTP ───────────────────────────────────────── */
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmationRef.current) return;
    setPhoneError('');
    setVerifyingOtp(true);
    try {
      const cred = await confirmationRef.current.confirm(otp);
      const token = await cred.user.getIdToken(true);
      idTokenRef.current = token;
      await redirectFromSession(token);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setPhoneError(/invalid-verification-code/.test(msg) ? 'Incorrect code. Try again.' : msg);
      shake();
    } finally {
      setVerifyingOtp(false);
    }
  }

  /* ── Accept pending invite (lazy flow) ──────────────────────── */
  async function handleAcceptInvite() {
    if (!pendingInvite || !idTokenRef.current) return;
    setAcceptingInvite(true);
    setAcceptError('');
    try {
      const res = await fetch(`/api/invites/${pendingInvite.inviteToken}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'phone', idToken: idTokenRef.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to accept invitation');

      // Re-fetch token with fresh custom claims then create session
      const { currentUser } = auth;
      if (!currentUser) throw new Error('Authentication lost. Please sign in again.');
      const freshToken = await currentUser.getIdToken(true);
      await redirectFromSession(freshToken);
    } catch (err: unknown) {
      setAcceptError(err instanceof Error ? err.message : 'Failed to accept invitation');
      setAcceptingInvite(false);
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
  };

  /* ── Pending invite screen ───────────────────────────────────── */
  if (pendingInvite) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-gray-50">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              'radial-gradient(1200px 600px at 10% -10%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(900px 500px at 110% 10%, rgba(129,140,248,0.22), transparent 55%)',
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          className="w-full max-w-md"
        >
          {/* Header card */}
          <div
            className="rounded-2xl p-7 mb-4 text-white text-center"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <CheckCircleSVG />
            </div>
            <h1 className="text-xl font-bold mb-1">You&apos;re invited!</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.78)' }}>
              {pendingInvite.invitedByName} invited you to join{' '}
              <strong>{pendingInvite.orgName}</strong>.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="text-sm text-gray-700 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">Name</span>
                <span className="font-medium">{pendingInvite.displayName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">Role</span>
                <span className="capitalize font-medium">{pendingInvite.role}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">Workspace</span>
                <span className="font-medium">{pendingInvite.orgName}</span>
              </div>
            </div>

            {acceptError && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                <AlertCircleSVG /><span>{acceptError}</span>
              </div>
            )}

            <Button className="w-full h-11" onClick={handleAcceptInvite} disabled={acceptingInvite}>
              {acceptingInvite ? (
                <span className="inline-flex items-center gap-2"><Loader2SVG />Joining workspace…</span>
              ) : (
                `Accept & Join ${pendingInvite.orgName}`
              )}
            </Button>
            <button
              type="button"
              className="w-full text-sm text-gray-500 hover:text-gray-700"
              onClick={() => { setPendingInvite(null); setPhoneStep('enter'); setOtp(''); }}
            >
              Not you? Go back
            </button>
          </div>

          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2">
              <MakhzoonMark size={20} />
              <span className="text-xs text-gray-500">Makhzoon · Secure invitation</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-gray-50">
      {/* Invisible reCAPTCHA anchor */}
      <div id="recaptcha-login" />

      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            'radial-gradient(1200px 600px at 10% -10%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(900px 500px at 110% 10%, rgba(129,140,248,0.22), transparent 55%), radial-gradient(800px 600px at 50% 120%, rgba(79,70,229,0.15), transparent 60%)',
        }}
      />

      <motion.div variants={container} initial="hidden" animate="show" className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE_SPRING }}
            className="inline-flex justify-center mb-4"
          >
            <MakhzoonMark size={48} />
          </motion.div>
          <motion.h1 variants={item} className="text-2xl font-bold text-gray-900">
            Sign in to your workspace
          </motion.h1>
          <motion.p variants={item} className="text-sm text-gray-500 mt-1">
            Welcome back to Makhzoon.
          </motion.p>
        </div>

        <motion.div animate={shakeControls}>
          <motion.div
            variants={item}
            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-gray-200/60 border border-gray-200 p-8"
          >
            {/* Tab toggle */}
            <div className="flex rounded-lg border border-gray-200 p-1 gap-1 bg-gray-50 mb-6">
              <button
                type="button"
                onClick={() => { setTab('email'); setEmailError(''); setPhoneError(''); }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-sm font-medium transition-colors',
                  tab === 'email' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <MailSVG /> Email
              </button>
              <button
                type="button"
                onClick={() => { setTab('phone'); setEmailError(''); setPhoneError(''); }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-sm font-medium transition-colors',
                  tab === 'phone' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <PhoneSVG /> Phone
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {/* ── Email tab ─────────────────────────────────── */}
              {tab === 'email' && (
                <motion.form
                  key="email"
                  onSubmit={handleEmailSubmit}
                  className="space-y-4"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOffSVG /> : <EyeSVG />}
                      </button>
                    </div>
                  </div>
                  <AnimatePresence initial={false}>
                    {emailError && (
                      <motion.div
                        key="email-err"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2"
                      >
                        <AlertCircleSVG /><span>{emailError}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Button type="submit" className="w-full" disabled={emailLoading}>
                    <AnimatePresence mode="wait" initial={false}>
                      {emailLoading ? (
                        <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2">
                          <Loader2SVG />Signing in…
                        </motion.span>
                      ) : (
                        <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          Sign In
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.form>
              )}

              {/* ── Phone tab ─────────────────────────────────── */}
              {tab === 'phone' && (
                <motion.div
                  key="phone"
                  className="space-y-4"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {phoneStep === 'enter' ? (
                      <motion.form
                        key="phone-enter"
                        onSubmit={handleSendOtp}
                        className="space-y-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="space-y-1.5">
                          <Label htmlFor="phone">Phone number</Label>
                          <Input
                            id="phone"
                            type="tel"
                            autoComplete="tel"
                            placeholder="+966501234567"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                          />
                          <p className="text-xs text-gray-400">Include country code (e.g. +966 for Saudi Arabia)</p>
                        </div>
                        <AnimatePresence initial={false}>
                          {phoneError && (
                            <motion.div
                              key="phone-err"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2"
                            >
                              <AlertCircleSVG /><span>{phoneError}</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <Button type="submit" className="w-full" disabled={sendingOtp}>
                          {sendingOtp ? (
                            <span className="inline-flex items-center gap-2"><Loader2SVG />Sending code…</span>
                          ) : 'Send verification code'}
                        </Button>
                      </motion.form>
                    ) : (
                      <motion.form
                        key="phone-verify"
                        onSubmit={handleVerifyOtp}
                        className="space-y-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <p className="text-sm text-gray-600">
                          Enter the 6-digit code sent to <strong>{phone}</strong>.
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
                        <AnimatePresence initial={false}>
                          {phoneError && (
                            <motion.div
                              key="otp-err"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2"
                            >
                              <AlertCircleSVG /><span>{phoneError}</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <Button type="submit" className="w-full" disabled={verifyingOtp || otp.length < 6}>
                          {verifyingOtp ? (
                            <span className="inline-flex items-center gap-2"><Loader2SVG />Verifying…</span>
                          ) : 'Sign in'}
                        </Button>
                        <button
                          type="button"
                          className="w-full text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                          onClick={() => { setPhoneStep('enter'); setOtp(''); setPhoneError(''); confirmationRef.current = null; recaptchaRef.current = null; }}
                        >
                          Didn&apos;t receive a code? Try again
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
