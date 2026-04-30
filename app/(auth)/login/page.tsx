'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { buildOrgPath, buildSuperAdminPath } from '@/lib/utils/tenant-url';
import { getFirstAccessiblePath } from '@/lib/utils/nav-config';
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

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const;
const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

const FEATURE_LIST = [
  'Multi-tenant by design',
  'Granular role-based access',
  'SOC 2 ready audit trail',
];

export default function LoginPage() {
  const router = useRouter();
  const shakeControls = useAnimation();

  const [tab, setTab] = useState<'email' | 'username'>('email');

  // Email/password
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Username/password
  const [username, setUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [showUsernamePassword, setShowUsernamePassword] = useState(false);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');

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

    const { role, orgSlug, features = {}, permissions = null } = body;
    if (SUPERADMIN_ROLES.has(role)) {
      router.push(buildSuperAdminPath('/dashboard'));
    } else if (orgSlug) {
      const firstPath = getFirstAccessiblePath({ role, features, permissions });
      router.push(buildOrgPath(orgSlug, firstPath));
    } else {
      router.push('/');
    }
    router.refresh();
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError('');
    setEmailLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, emailPassword);
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
      const token = await cred.user.getIdToken();
      await redirectFromSession(token);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid username or password';
      const isFirebaseAuth = msg.startsWith('Firebase') || /auth\//.test(msg);
      setUsernameError(isFirebaseAuth ? 'Invalid username or password' : msg);
      shake();
      setUsernameLoading(false);
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

  return (
    <div className="min-h-screen flex">
      {/* ── Form side ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 bg-white dark:bg-gray-950 relative overflow-hidden">
        {/* Subtle background gradient */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-50"
          style={{
            background:
              'radial-gradient(900px 600px at 10% -10%, rgba(99,102,241,0.12), transparent 60%), radial-gradient(700px 500px at 110% 110%, rgba(129,140,248,0.14), transparent 55%)',
          }}
        />

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
              Sign in to your workspace to manage your office assets.
            </p>
          </motion.div>

          <motion.div animate={shakeControls}>
            <motion.div variants={item}>
              {/* Tab toggle */}
              <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 p-1 gap-1 bg-gray-50 dark:bg-gray-800/60 mb-6">
                <button
                  type="button"
                  onClick={() => { setTab('email'); setEmailError(''); setUsernameError(''); }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-sm font-medium transition-all duration-150',
                    tab === 'email'
                      ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                  )}
                >
                  <MailSVG /> Email
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('username'); setEmailError(''); setUsernameError(''); }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-sm font-medium transition-all duration-150',
                    tab === 'username'
                      ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
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
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors font-medium"
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
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
                          className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5"
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
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
                          className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl px-3 py-2.5"
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
            <span className="text-indigo-600 dark:text-indigo-400 font-medium cursor-pointer hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
              Contact sales
            </span>
          </motion.p>
        </motion.div>
      </div>

      {/* ── Marketing side ────────────────────────────────────────── */}
      <div
        className="hidden lg:flex w-[480px] xl:w-[560px] flex-shrink-0 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'var(--primary-600)' }}
      >
        {/* Decorative rings */}
        <div
          aria-hidden
          className="absolute right-0 bottom-0 translate-x-1/3 translate-y-1/3 w-[480px] h-[480px] rounded-full border border-white/10 pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 w-[320px] h-[320px] rounded-full border border-white/8 pointer-events-none"
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
            Every laptop, license, and chair — accounted for.
          </h2>
          <p className="text-sm text-white/80 leading-relaxed max-w-xs">
            One source of truth for the assets your office runs on. Approvals, warranties, and full audit trails — built for small operational teams.
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
        <p className="text-xs text-white/50 relative z-10">
          © {new Date().getFullYear()} Makhzoon · Trusted by growing office teams
        </p>
      </div>
    </div>
  );
}
