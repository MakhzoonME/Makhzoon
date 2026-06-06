'use client';
import { useState, useEffect, useSyncExternalStore } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { analytics } from '@/lib/analytics';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageToggle } from '@/components/shared/LanguageToggle';
import { buildOrgPath, buildSuperAdminPath } from '@/lib/utils/tenant-url';
import { getFirstAccessiblePath } from '@/lib/nav';
import { cn } from '@/lib/utils/cn';
import { toast, useT } from '@/hooks/ui';

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

/* ── Forgot Password Modal ───────────────────────────────────── */
function ForgotPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function reset() { setResetEmail(''); setLoading(false); setSubmitted(false); setError(''); }
  function handleClose() { onClose(); setTimeout(reset, 300); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const checkRes = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const { exists } = await checkRes.json().catch(() => ({ exists: false }));
      if (!exists) {
        setError('No account found with this email address.');
        return;
      }

      const res = await fetch('/api/auth/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      if (res.status === 429) {
        setError('Too many attempts. Please wait a moment before trying again.');
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
          <motion.div
            className="relative bg-surface-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
          >
            <button type="button" onClick={handleClose} className="absolute top-4 end-4 text-gray-500 hover:text-gray-800 transition-colors" aria-label="Close">
              <XSVGIcon />
            </button>
            <AnimatePresence mode="wait" initial={false}>
              {submitted ? (
                <motion.div key="success" className="flex flex-col items-center text-center py-6 gap-4"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <span className="text-primary-600"><CheckCircleSVG /></span>
                  <h2 className="text-lg font-semibold text-gray-900">{t('auth.resetLinkSent')}</h2>
                  <p className="text-sm text-gray-500 max-w-xs">{t('auth.resetLinkSentBody').replace('{email}', resetEmail.trim())}</p>
                  <Button className="mt-2" onClick={handleClose}>{t('auth.backToSignIn')}</Button>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('auth.forgotPasswordTitle')}</h2>
                  <p className="text-sm text-gray-500 mb-3">{t('auth.forgotPasswordSubtitle')}</p>
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5" aria-hidden>
                      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M8 5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span>Username accounts cannot reset passwords via email. Ask your organization admin to reset your password from the Users settings page.</span>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-email">{t('auth.emailFieldLabel')}</Label>
                      <Input
                        id="reset-email" type="email" autoComplete="email"
                        placeholder={t('auth.emailPlaceholder')}
                        value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required
                      />
                    </div>
                    {error && (
                      <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                        <AlertCircleSVG /><span>{error}</span>
                      </div>
                    )}
                    <div className="flex gap-3 pt-1">
                      <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>{t('auth.backToSignIn')}</Button>
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? <span className="inline-flex items-center gap-2"><Loader2SVG />{t('auth.sending')}</span> : t('auth.sendResetLink')}
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

/* ── Contact Sales Modal ─────────────────────────────────────── */
function ContactSalesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setFirstName(''); setLastName(''); setPhone(''); setEmail(''); setOrganizationName(''); setNotes('');
    setLoading(false); setSubmitted(false); setError('');
  }

  function handleClose() { onClose(); setTimeout(reset, 300); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, name: [firstName, lastName].filter(Boolean).join(' ') || 'Unknown', organizationName, phone, email, notes }),
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
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
          <motion.div
            className="relative bg-surface-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 z-10"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
          >
            <button type="button" onClick={handleClose} className="absolute top-4 end-4 text-gray-500 hover:text-gray-800 transition-colors" aria-label="Close">
              <XSVGIcon />
            </button>
            <AnimatePresence mode="wait" initial={false}>
              {submitted ? (
                <motion.div key="success" className="flex flex-col items-center text-center py-6 gap-4"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <span className="text-primary-600"><CheckCircleSVG /></span>
                  <h2 className="text-lg font-semibold text-gray-900">{t('auth.requestSent')}</h2>
                  <p className="text-sm text-gray-500 max-w-xs">{t('auth.requestSentBody')}</p>
                  <Button className="mt-2" onClick={handleClose}>{t('common.cancel')}</Button>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('auth.contactSalesTitle')}</h2>
                  <p className="text-sm text-gray-500 mb-6">{t('auth.contactSalesSubtitle')}</p>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="cs-firstName">{t('auth.firstName')}</Label>
                        <Input id="cs-firstName" type="text" placeholder={t('auth.firstNamePlaceholder')} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoCapitalize="words" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cs-lastName">{t('auth.lastName')}</Label>
                        <Input id="cs-lastName" type="text" placeholder={t('auth.lastNamePlaceholder')} value={lastName} onChange={(e) => setLastName(e.target.value)} autoCapitalize="words" required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cs-org">{t('auth.orgName')}</Label>
                      <Input id="cs-org" type="text" placeholder={t('auth.orgNamePlaceholder')} value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="cs-phone">{t('auth.phone')}</Label>
                        <Input id="cs-phone" type="tel" placeholder={t('auth.phonePlaceholder')} value={phone} onChange={(e) => setPhone(e.target.value)} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cs-email">{t('auth.emailFieldLabel')}</Label>
                        <Input id="cs-email" type="email" placeholder={t('auth.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cs-notes">
                        {t('auth.notes')}{' '}
                        <span className="text-gray-400 font-normal">{t('auth.notesOptional')}</span>
                      </Label>
                      <textarea
                        id="cs-notes" rows={3}
                        placeholder={t('auth.notesPlaceholder')}
                        value={notes} onChange={(e) => setNotes(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface-page px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none transition-colors"
                      />
                    </div>
                    {error && (
                      <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                        <AlertCircleSVG /><span>{error}</span>
                      </div>
                    )}
                    <div className="flex gap-3 pt-1">
                      <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>{t('common.cancel')}</Button>
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? <span className="inline-flex items-center gap-2"><Loader2SVG />{t('auth.sending')}</span> : t('auth.sendRequest')}
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
  const { t } = useT();
  const shakeControls = useAnimation();

  const [tab, setTab] = useState<'email' | 'username'>('email');
  const [contactOpen, setContactOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const sessionExpiredMessage = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        if (sessionStorage.getItem('auth.session_expired')) {
          sessionStorage.removeItem('auth.session_expired');
          return t('auth.sessionExpired');
        }
      } catch { /* sessionStorage unavailable */ }
      return '';
    },
    () => '',
  );
  const globalError = sessionExpiredMessage;

  useEffect(() => {
    if (sessionExpiredMessage) return; // skip auto-redirect when prompting re-auth
    fetch('/api/auth/me', { cache: 'no-store' }).then(async (res) => {
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
  }, [locale, router, sessionExpiredMessage]);

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

  async function redirectFromSession() {
    // The Supabase browser client (signInWithPassword) has already set the
    // auth cookies via @supabase/ssr; this endpoint reads them, enforces the
    // suspended-org gate, and returns the post-login routing payload.
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (body.orgSuspended) toast.error('This workspace is suspended. Please contact support to restore access.');
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
      const supabase = await createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: emailPassword,
      });
      if (error) throw error;
      analytics.track('user_signed_in', { method: 'email' });
      await redirectFromSession();
    } catch (err: unknown) {
      setEmailError(getAuthErrorMessage(err, 'email'));
      shake();
      setEmailLoading(false);
    }
  }

  async function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUsernameError('');
    if (!username.trim()) { setUsernameError('Username is required'); shake(); return; }
    setUsernameLoading(true);
    try {
      // Username accounts are backed by a synthetic email (preserved 1:1 from
      // the Firebase model) so Supabase email/password sign-in works as-is.
      const syntheticEmail = `${username.trim().toLowerCase()}@makhzoon.local`;
      const supabase = await createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password: usernamePassword,
      });
      if (error) throw error;
      analytics.track('user_signed_in', { method: 'username' });
      await redirectFromSession();
    } catch (err: unknown) {
      setUsernameError(getAuthErrorMessage(err, 'username'));
      shake();
      setUsernameLoading(false);
    }
  }

  function getAuthErrorMessage(err: unknown, mode: 'email' | 'username'): string {
    const e = err as { message?: string; status?: number; code?: string } | null;
    const status = e?.status;
    const code = e?.code ?? '';
    const msg = (e?.message ?? '').toLowerCase();
    if (status === 429 || code === 'over_request_rate_limit')
      return 'Too many failed attempts. Please try again later or reset your password.';
    if (code === 'user_banned' || msg.includes('banned') || msg.includes('disabled'))
      return 'This account has been deactivated. Please contact support.';
    if (code === 'email_not_confirmed' || msg.includes('not confirmed'))
      return 'Please confirm your account before signing in.';
    if (
      code === 'invalid_credentials' ||
      msg.includes('invalid login credentials') ||
      msg.includes('invalid')
    )
      return mode === 'email'
        ? 'Incorrect email or password. Please try again.'
        : 'Incorrect username or password. Please try again.';
    if (msg.includes('network') || msg.includes('fetch'))
      return 'Network error. Please check your connection and try again.';
    if (e?.message) return e.message;
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

  const featureKeys = ['auth.feature1', 'auth.feature2', 'auth.feature3'] as const;

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-surface-page">

      {/* ── Left: Login form ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 relative">
        {/* Toggles — pinned inside the form column, not over the purple panel */}
        <div className="absolute top-4 end-4 flex items-center gap-1">
          <LanguageToggle variant="ghost-light" />
          <ThemeToggle variant="ghost-light" />
        </div>

        <motion.div variants={container} initial="hidden" animate="show" className="w-full max-w-sm">
          {/* Logo — mark + wordmark */}
          <motion.div variants={item} className="flex items-center gap-2.5 mb-8">
            <MakhzoonMark size={36} radius={9} />
            <span className="text-lg font-bold text-gray-900" style={{ letterSpacing: '-0.01em' }}>
              {t('auth.brandName')}
            </span>
          </motion.div>

          <motion.div variants={item} className="mb-7">
            <h1 className="font-extrabold text-gray-900 tracking-tight"
              style={{ fontSize: 28, letterSpacing: '-0.01em', fontFamily: 'var(--font-display)' }}>
              {t('auth.welcomeBack')}
            </h1>
            <p className="text-sm text-gray-500 mt-1.5 leading-snug">
              {t('auth.welcomeSubtitle')}
            </p>
          </motion.div>

          <AnimatePresence initial={false}>
            {globalError && (
              <motion.div
                key="global-err"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-4"
              >
                <AlertCircleSVG /><span>{globalError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div animate={shakeControls}>
            <motion.div variants={item}
              className="bg-surface-card border border-border"
              style={{ borderRadius: 16, boxShadow: 'var(--shadow-md)', padding: 26 }}>
              {/* Tab toggle — surface-inset container, rounder active pill */}
              <div className="flex p-1 gap-1 mb-6"
                style={{ background: 'var(--surface-inset)', borderRadius: 12 }}>
                <button
                  type="button"
                  onClick={() => { setTab('email'); setEmailError(''); setUsernameError(''); }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-semibold transition-colors duration-150 cursor-pointer',
                    tab === 'email'
                      ? 'bg-surface-card text-primary-700 shadow-xs'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                  style={{ borderRadius: 9 }}
                >
                  <MailSVG aria-hidden /> {t('auth.tabEmail')}
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('username'); setEmailError(''); setUsernameError(''); }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-semibold transition-colors duration-150 cursor-pointer',
                    tab === 'username'
                      ? 'bg-surface-card text-primary-700 shadow-xs'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                  style={{ borderRadius: 9 }}
                >
                  <UserSVG /> {t('auth.tabUsername')}
                </button>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {/* ── Email tab ─────────────────────────────────── */}
                {tab === 'email' && (
                  <motion.form key="email" onSubmit={handleEmailSubmit} className="space-y-4"
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }}>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">{t('auth.email')}</Label>
                      <Input id="email" type="email" autoComplete="email" placeholder={t('auth.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email-password">{t('auth.password')}</Label>
                        <button type="button" onClick={() => setForgotOpen(true)} className="text-xs text-primary-600 hover:text-primary-700 transition-colors font-medium">
                          {t('auth.forgotPassword')}
                        </button>
                      </div>
                      <div className="relative">
                        <Input id="email-password" type={showEmailPassword ? 'text' : 'password'} autoComplete="current-password"
                          placeholder={t('auth.passwordPlaceholder')} value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} required className="pr-10" />
                        <button type="button" className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          onClick={() => setShowEmailPassword(!showEmailPassword)} aria-label={showEmailPassword ? 'Hide password' : 'Show password'}>
                          {showEmailPassword ? <EyeOffSVG /> : <EyeSVG />}
                        </button>
                      </div>
                    </div>
                    <AnimatePresence initial={false}>
                      {emailError && (
                        <motion.div key="email-err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                          className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                          <AlertCircleSVG /><span>{emailError}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Button type="submit" className="w-full" disabled={emailLoading}>
                      <AnimatePresence mode="wait" initial={false}>
                        {emailLoading
                          ? <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2"><Loader2SVG />{t('auth.signingIn')}</motion.span>
                          : <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{t('auth.signIn')}</motion.span>}
                      </AnimatePresence>
                    </Button>
                  </motion.form>
                )}

                {/* ── Username tab ──────────────────────────────── */}
                {tab === 'username' && (
                  <motion.form key="username" onSubmit={handleUsernameSubmit} className="space-y-4"
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                    <div className="space-y-1.5">
                      <Label htmlFor="username">{t('auth.usernameLabel')}</Label>
                      <Input id="username" type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off"
                        placeholder={t('auth.usernamePlaceholder')} value={username} onChange={(e) => setUsername(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="username-password">{t('auth.password')}</Label>
                      <div className="relative">
                        <Input id="username-password" type={showUsernamePassword ? 'text' : 'password'} autoComplete="current-password"
                          placeholder={t('auth.passwordPlaceholder')} value={usernamePassword} onChange={(e) => setUsernamePassword(e.target.value)} required className="pr-10" />
                        <button type="button" className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          onClick={() => setShowUsernamePassword(!showUsernamePassword)} aria-label={showUsernamePassword ? 'Hide password' : 'Show password'}>
                          {showUsernamePassword ? <EyeOffSVG /> : <EyeSVG />}
                        </button>
                      </div>
                    </div>
                    <AnimatePresence initial={false}>
                      {usernameError && (
                        <motion.div key="username-err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                          className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                          <AlertCircleSVG /><span>{usernameError}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Button type="submit" className="w-full" disabled={usernameLoading}>
                      <AnimatePresence mode="wait" initial={false}>
                        {usernameLoading
                          ? <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2"><Loader2SVG />{t('auth.signingIn')}</motion.span>
                          : <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{t('auth.signIn')}</motion.span>}
                      </AnimatePresence>
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          <motion.p variants={item} className="text-sm text-gray-600 mt-8 text-center">
            {t('auth.noAccount')}{' '}
            <a href={`/${locale}/signup`}
              className="text-primary-600 font-medium hover:text-primary-700 transition-colors underline-offset-2 hover:underline">
              {t('auth.createWorkspace')}
            </a>
          </motion.p>

          <motion.p variants={item} className="text-xs text-gray-400 mt-2 text-center">
            {t('auth.needWorkspace')}{' '}
            <button type="button" onClick={() => setContactOpen(true)}
              className="text-gray-500 font-medium hover:text-gray-700 transition-colors underline-offset-2 hover:underline">
              {t('auth.contactSales')}
            </button>
          </motion.p>
        </motion.div>
      </div>

      {/* ── Right: Marketing panel ────────────────────────────── */}
      <div
        className="hidden lg:flex w-[46%] flex-shrink-0 flex-col justify-between relative overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #4F46E5 0%, #4338CA 100%)', padding: '40px 56px', color: '#fff' }}
      >
        {/* Decorative — 4-ring SVG bottom-right */}
        <svg
          aria-hidden
          className="pointer-events-none absolute"
          style={{ insetInlineEnd: -160, bottom: -180, opacity: 0.18 }}
          width="560" height="560" viewBox="0 0 560 560" fill="none"
        >
          {[120, 180, 240, 280].map((r) => (
            <circle key={r} cx="380" cy="380" r={r} stroke="#fff" strokeWidth="1.2" />
          ))}
        </svg>

        {/* Decorative — soft radial blob top-start */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            insetInlineStart: -80, top: -80,
            width: 320, height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.14), transparent 70%)',
            filter: 'blur(20px)',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5 z-10">
          <MakhzoonMark size={32} fill="rgba(255,255,255,0.18)" glyphFill="#fff" radius={8} />
          <span className="text-base font-bold" style={{ opacity: 0.92 }}>
            {t('auth.brandName')}
          </span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10" style={{ maxWidth: 420 }}>
          <h2
            className="font-extrabold text-white leading-tight"
            style={{ fontSize: 40, letterSpacing: locale === 'ar' ? 0 : '-0.01em', fontFamily: locale === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)', marginBottom: 22, lineHeight: locale === 'ar' ? 1.35 : 1.1 }}
          >
            {t('auth.marketingHeadline')}
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: 'rgba(255,255,255,0.82)', marginBottom: 30 }}>
            {t('auth.marketingBody')}
          </p>
          <ul className="space-y-4">
            {featureKeys.map((key) => (
              <li key={key} className="flex items-center gap-3" style={{ fontSize: 15.5, fontWeight: 500, color: 'rgba(255,255,255,0.92)' }}>
                <span
                  className="flex items-center justify-center flex-shrink-0 rounded-full"
                  style={{ width: 26, height: 26, background: 'rgba(255,255,255,0.18)' }}
                >
                  <CheckSVG />
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="relative z-10" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          © {new Date().getFullYear()} {t('auth.brandName')} · {t('auth.marketingFooter')}
        </p>
      </div>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
      <ContactSalesModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
