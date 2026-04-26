'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { buildOrgPath, buildSuperAdminPath } from '@/lib/utils/tenant-url';

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const shakeControls = useAnimation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Session creation failed (HTTP ${res.status})`);
      }

      const { role, orgSlug } = await res.json();
      if (role === 'super_admin') {
        router.push(buildSuperAdminPath('/dashboard'));
      } else if (orgSlug) {
        router.push(buildOrgPath(orgSlug, '/dashboard'));
      } else {
        router.push('/');
      }
    } catch (err: unknown) {
      console.error('[login] sign-in failed:', err);
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      const isFirebaseAuth = msg.startsWith('Firebase') || /auth\//.test(msg);
      setError(isFirebaseAuth ? 'Invalid email or password' : msg);
      shakeControls.start({
        x: [0, -6, 6, -4, 4, 0],
        transition: { duration: 0.4, ease: 'easeInOut' },
      });
      setLoading(false);
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.1 },
    },
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
          backgroundSize: '300% 300%',
          animation: 'gradient-shift 14s ease infinite',
        }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-md"
      >
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div variants={item} className="space-y-1.5">
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
              </motion.div>

              <motion.div variants={item} className="space-y-1.5">
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-150"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffSVG /> : <EyeSVG />}
                  </button>
                </div>
              </motion.div>

              <AnimatePresence initial={false}>
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, height: 0, y: -4 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -4 }}
                    transition={{ duration: 0.22, ease: EASE_OUT }}
                    className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2"
                  >
                    <AlertCircleSVG />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div variants={item}>
                <Button type="submit" className="w-full" disabled={loading}>
                  <AnimatePresence mode="wait" initial={false}>
                    {loading ? (
                      <motion.span
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="inline-flex items-center gap-2"
                      >
                        <Loader2SVG />
                        Signing in…
                      </motion.span>
                    ) : (
                      <motion.span
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        Sign In
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </form>
          </motion.div>
        </motion.div>

      </motion.div>
    </div>
  );
}
