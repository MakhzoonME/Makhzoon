'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageToggle } from '@/components/shared/LanguageToggle';
import { buildOrgPath, buildSuperAdminPath } from '@/lib/utils/tenant-url';
import { getFirstAccessiblePath } from '@/lib/nav';
import { cn } from '@/lib/utils/cn';
import { toast } from '@/hooks/ui';

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
function UserSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="5" r="3" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M1.5 13c0-3.038 2.462-5 5.5-5s5.5 1.962 5.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
function CheckSVG() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2.5 7l3 3.5 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function XSVGIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function CheckCircleSVG() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
      <path d="M12 20l5.5 6 10.5-12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

const FEATURE_LIST = [
  'Assets, inventory & warranties in one place',
  'POS-ready for retail stores and offices',
  'Granular role-based access control',
];

/* ── Contact Sales Modal ─────────────────────────────────────── */
function ContactSalesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setName(''); setOrganizationName(''); setPhone(''); setEmail(''); setNotes('');
    setLoading(false); setSubmitted(false); setError('');
  }

  function handleClose() {
    onClose();
    setTimeout(reset, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, organizationName, phone, email, notes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to send. Please try again.');
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Dialog */}
          <motion.div
            className="relative bg-surface-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 z-10"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 end-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <XSVGIcon />
            </button>

            <AnimatePresence mode="wait" initial={false}>
              {submitted ? (
                <motion.div
                  key="success"
                  className="flex flex-col items-center text-center py-6 gap-4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <span className="text-primary-600 dark:text-primary-400">
                    <CheckCircleSVG />
                  </span>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Request sent!</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                    Our team will reach out to you shortly to get your workspace set up.
                  </p>
                  <Button className="mt-2" onClick={handleClose}>Close</Button>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Contact Sales</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Tell us about your team and we&apos;ll get you set up.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="cs-name">Full name</Label>
                      <Input
                        id="cs-name"
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cs-org">Organization name</Label>
                      <Input
                        id="cs-org"
                        type="text"
                        placeholder="Company or store name"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="cs-phone">Phone number</Label>
                        <Input
                          id="cs-phone"
                          type="tel"
                          placeholder="+966 5x xxx xxxx"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cs-email">Email</Label>
                        <Input
                          id="cs-email"
                          type="email"
                          placeholder="you@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cs-notes">Additional notes <span className="text-gray-400 font-normal">(optional)</span></Label>
                      <textarea
                        id="cs-notes"
                        rows={3}
                        placeholder="Tell us about your setup — number of locations, asset types, team size…"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface-page px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none transition-colors"
                      />
                    </div>

                    {error && (
                      <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5">
                        <AlertCircleSVG /><span>{error}</span>
                      </div>
                    )}

                    <div className="flex gap-3 pt-1">
                      <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? (
                          <span className="inline-flex items-center gap-2"><Loader2SVG />Sending…</span>
                        ) : 'Send request'}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? 'en';
  const shakeControls = useAnimation();

  const [tab, setTab] = useState<'email' | 'username'>('email');
  const [globalError, setGlobalError] = useState('');
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('auth.session_expired')) {
        setGlobalError('Your session expired. Please sign in again.');
        sessionStorage.removeItem('auth.session_expired');
        return;
      }
    } catch { /* sessionStorage unavailable */ }
    fetch('/api/auth/me').then(async (res) => {
      if (!res.ok) return;
      const body = await res.json().catch(() => null);
      if (!body) return;
      const { role, orgSlug, features = {}, permissions = null } = body;
      if (SUPERADMIN_ROLES.has(role)) {
        router.replace(buildSuperAdminPath(locale, '/dashboard'));
      } else if (orgSlug) {
        const firstPath = getFirstAccessiblePath({ locale, role, features, permissions });
        router.replace(buildOrgPath(locale, orgSlug, firstPath));
      }
    }).catch(() => {});
  }, [locale, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const [username, setUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [showUsernamePassword, setShowUsernamePassword] = useState(false);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  function shake() {
    shakeControls.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.4, ease: 'easeInOut' } });
  }

  async function redirectFromSession(idToken: string, token: string | null) {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, turnstileToken: token ?? '' }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (body.orgSuspended) {
        toast.error('This workspace is suspended. Please contact support to restore access.');
      }
      throw new Error(body.error || 'Session creation failed');
    }

    const { role, orgSlug, features = {}, permissions = null } = body;
    if (SUPERADMIN_ROLES.has(role)) {
      router.push(buildSuperAdminPath(locale, '/dashboard'));
    } else if (orgSlug) {
      const firstPath = getFirstAccessiblePath({ locale, role, features, permissions });
      router.push(buildOrgPath(locale, orgSlug, firstPath));
    } else {
      throw new Error('Your workspace could not be found. Please contact support.');
    }
    router.refresh();
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError('');
    setEmailLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, emailPassword);
      const idToken = await cred.user.getIdToken();
      await redirectFromSession(idToken, null);
    } catch (err: unknown) {
      setEmailError(getFirebaseAuthErrorMessage(err, 'email'));
      shake();
      setEmailLoading(false);
    }
  }

  async function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUsernameError('');
    if (!username.trim()) {
      setUsernameError('Username is required');
      shake();
      return;
    }
    setUsernameLoading(true);
    try {
      const syntheticEmail = `${username.trim().toLowerCase()}@makhzoon.local`;
      const cred = await signInWithEmailAndPassword(auth, syntheticEmail, usernamePassword);
      const idToken = await cred.user.getIdToken();
      await redirectFromSession(idToken, null);
    } catch (err: unknown) {
      setUsernameError(getFirebaseAuthErrorMessage(err, 'username'));
      shake();
      setUsernameLoading(false);
    }
  }

  function getFirebaseAuthErrorMessage(err: unknown, mode: 'email' | 'username'): string {
    const code = (err as { code?: string } | null)?.code ?? '';

    if (code === 'auth/user-disabled') return 'This account has been deactivated. Please contact support.';
    if (code === 'auth/user-not-found') return mode === 'email' ? 'No account found with this email address.' : 'No account found with this username.';
    if (code === 'auth/wrong-password') return 'Incorrect password. Please try again.';
    if (code === 'auth/too-many-requests') return 'Too many failed attempts. Please try again later or reset your password.';
    if (code === 'auth/invalid-email') return 'Invalid email address format.';
    if (/^auth\//.test(code)) return 'Sign in failed. Please check your credentials and try again.';
    if (err instanceof Error) return err.message;
    return 'Sign in failed. Please check your credentials and try again.';
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
  };

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-surface-page">
      {/* Top-right toggles */}
      <div className="absolute top-4 end-4 z-20 flex items-center gap-1">
        <LanguageToggle variant="ghost-light" />
        <ThemeToggle variant="ghost-light" />
      </div>

      {/* ── Left: Login form ──────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="w-full max-w-sm"
        >
          {/* Logo */}
          <motion.div variants={item} className="flex items-center gap-2.5 mb-8">
            <MakhzoonMark size={32} />
            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Makhzoon<span className="text-gray-400 dark:text-gray-500 font-normal">·ME</span>
            </span>
          </motion.div>

          <motion.div variants={item} className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Sign in to your workspace to manage your assets and inventory.
            </p>
          </motion.div>

          <AnimatePresence initial={false}>
            {globalError && (
              <motion.div
                key="global-err"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl px-3 py-2.5 mb-4"
              >
                <AlertCircleSVG /><span>{globalError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div animate={shakeControls}>
            <motion.div
              variants={item}
              className="bg-surface-card backdrop-blur-sm rounded-2xl shadow-lg shadow-black/10 border border-border p-8"
            >
              {/* Tab toggle */}
              <div className="flex rounded-lg border border-border p-1 gap-1 bg-surface-page mb-6">
                <button
                  type="button"
                  onClick={() => { setTab('email'); setEmailError(''); setUsernameError(''); }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-sm font-medium transition-colors',
                    tab === 'email'
                      ? 'bg-surface-card text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  )}
                >
                  <MailSVG /> Email
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('username'); setEmailError(''); setUsernameError(''); }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-sm font-medium transition-colors',
                    tab === 'username'
                      ? 'bg-surface-card text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  )}
                >
                  <UserSVG /> Username
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
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email-password">Password</Label>
                        <button
                          type="button"
                          className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors font-medium"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="email-password"
                          type={showEmailPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={emailPassword}
                          onChange={(e) => setEmailPassword(e.target.value)}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          onClick={() => setShowEmailPassword(!showEmailPassword)}
                          aria-label={showEmailPassword ? 'Hide password' : 'Show password'}
                        >
                          {showEmailPassword ? <EyeOffSVG /> : <EyeSVG />}
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
                          className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5"
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

                {/* ── Username tab ──────────────────────────────── */}
                {tab === 'username' && (
                  <motion.form
                    key="username"
                    onSubmit={handleUsernameSubmit}
                    className="space-y-4"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        placeholder="your_username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="username-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="username-password"
                          type={showUsernamePassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={usernamePassword}
                          onChange={(e) => setUsernamePassword(e.target.value)}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          onClick={() => setShowUsernamePassword(!showUsernamePassword)}
                          aria-label={showUsernamePassword ? 'Hide password' : 'Show password'}
                        >
                          {showUsernamePassword ? <EyeOffSVG /> : <EyeSVG />}
                        </button>
                      </div>
                    </div>
                    <AnimatePresence initial={false}>
                      {usernameError && (
                        <motion.div
                          key="username-err"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5"
                        >
                          <AlertCircleSVG /><span>{usernameError}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Button type="submit" className="w-full" disabled={usernameLoading}>
                      <AnimatePresence mode="wait" initial={false}>
                        {usernameLoading ? (
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
              </AnimatePresence>
            </motion.div>
          </motion.div>

          <motion.p variants={item} className="text-xs text-gray-400 dark:text-gray-500 mt-8 text-center">
            Need a workspace?{' '}
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="text-primary-600 dark:text-primary-400 font-medium cursor-pointer hover:text-primary-700 dark:hover:text-primary-300 transition-colors underline-offset-2 hover:underline"
            >
              Contact sales
            </button>
          </motion.p>
        </motion.div>
      </div>

      {/* ── Right: Marketing panel ────────────────────────────── */}
      <div
        className="hidden lg:flex w-[480px] xl:w-[560px] flex-shrink-0 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'var(--primary-600)' }}
      >
        {/* Decorative rings */}
        <div
          aria-hidden
          className="absolute end-0 bottom-0 translate-x-1/3 translate-y-1/3 w-[480px] h-[480px] rounded-full border border-white/10 pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute end-0 bottom-0 translate-x-1/4 translate-y-1/4 w-[320px] h-[320px] rounded-full border border-white/8 pointer-events-none"
        />

        {/* Logo mark */}
        <div className="flex items-center gap-2.5 relative z-10">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          >
            <div className="h-3.5 w-3.5 rounded-sm border-[1.5px] border-white" />
          </div>
          <span className="text-sm font-semibold text-white/90">Makhzoon·ME</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-6">
          <h2 className="text-[2rem] font-bold text-white leading-tight tracking-tight max-w-sm" style={{ letterSpacing: '-0.5px' }}>
            Track assets, run inventory, and manage warranties — all in one place.
          </h2>
          <p className="text-sm text-white/80 leading-relaxed max-w-xs">
            From retail store shelves to office laptops, Makhzoon gives your team a single system for assets, inventory, warranties, and point-of-sale — built for growing operations.
          </p>

          {/* Feature checklist */}
          <ul className="space-y-3">
            {FEATURE_LIST.map((feat) => (
              <li key={feat} className="flex items-center gap-3 text-sm text-white/90">
                <span
                  className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  <CheckSVG />
                </span>
                {feat}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="text-xs text-white/50 relative z-10 mt-8">
          © {new Date().getFullYear()} Makhzoon · Trusted by growing office teams
        </p>
      </div>

      {/* Contact Sales Modal */}
      <ContactSalesModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
