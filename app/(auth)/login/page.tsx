'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { buildOrgPath, buildSuperAdminPath } from '@/lib/utils/tenant-url';
import { getFirstAccessiblePath } from '@/lib/nav';
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

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const;

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

export default function LoginPage() {
  const router = useRouter();
  const shakeControls = useAnimation();

  const [tab, setTab] = useState<'email' | 'username'>('email');
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    try {
      if (sessionStorage.getItem('auth.session_expired')) {
        setGlobalError('Your session expired. Please sign in again.');
        sessionStorage.removeItem('auth.session_expired');
      }
    } catch { /* sessionStorage unavailable */ }
  }, []);


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

  async function redirectFromSession(idToken: string, token: string | null) {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, turnstileToken: token ?? '' }),
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
      throw new Error('Your workspace could not be found. Please contact support.');
    }
  }

  /* ── Email/password submit ───────────────────────────────────── */
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError('');
    setEmailLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, emailPassword);
      const idToken = await cred.user.getIdToken();
      await redirectFromSession(idToken, null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      const isFirebaseAuth = msg.startsWith('Firebase') || /auth\//.test(msg);
      setEmailError(isFirebaseAuth ? 'Invalid email or password' : msg);
      shake();
      setEmailLoading(false);
    }
  }

  /* ── Username/password submit ────────────────────────────────── */
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
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-gray-50">
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

        <AnimatePresence>
          {globalError && (
            <motion.div
              key="global-err"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4"
            >
              <AlertCircleSVG /><span>{globalError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div animate={shakeControls}>
          <motion.div
            variants={item}
            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-gray-200/60 border border-gray-200 p-8"
          >
            {/* Tab toggle */}
            <div className="flex rounded-lg border border-gray-200 p-1 gap-1 bg-gray-50 mb-6">
              <button
                type="button"
                onClick={() => { setTab('email'); setEmailError(''); setUsernameError(''); }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-sm font-medium transition-colors',
                  tab === 'email' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <MailSVG /> Email
              </button>
              <button
                type="button"
                onClick={() => { setTab('username'); setEmailError(''); setUsernameError(''); }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-sm font-medium transition-colors',
                  tab === 'username' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email-password">Password</Label>
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                        className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2"
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
      </motion.div>
    </div>
  );
}
