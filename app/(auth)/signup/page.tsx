'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, AlertCircle } from 'lucide-react';
import { buildTenantUrl } from '@/lib/utils/tenant-url';

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const;

export default function SignupPage() {
  const [orgName, setOrgName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const shakeControls = useAnimation();

  function deriveSubdomain(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  }

  function handleOrgName(v: string) {
    setOrgName(v);
    if (!subdomainTouched) setSubdomain(deriveSubdomain(v));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/organizations/self-serve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName, subdomain, displayName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === 'string' ? data.error : 'Signup failed';
        throw new Error(msg);
      }

      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      });
      if (!sessionRes.ok) throw new Error('Session creation failed');
      window.location.href = buildTenantUrl(subdomain, '/dashboard');
    } catch (err) {
      console.error('[signup] failed:', err);
      setError(err instanceof Error ? err.message : 'Signup failed');
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
      transition: { staggerChildren: 0.05, delayChildren: 0.1 },
    },
  };
  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden bg-gray-50">
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
            className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/25 mb-4"
          >
            <Building2 className="text-white h-6 w-6" />
          </motion.div>
          <motion.h1 variants={item} className="text-2xl font-bold text-gray-900">
            Create your workspace
          </motion.h1>
          <motion.p variants={item} className="text-sm text-gray-500 mt-1">
            Start your 14-day free trial.
          </motion.p>
        </div>

        <motion.div animate={shakeControls}>
          <motion.div
            variants={item}
            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-gray-200/60 border border-gray-200 p-6"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div variants={item} className="space-y-1.5">
                <Label htmlFor="orgName">Organization name</Label>
                <Input id="orgName" value={orgName} onChange={(e) => handleOrgName(e.target.value)} placeholder="Acme Inc." required />
              </motion.div>

              <motion.div variants={item} className="space-y-1.5">
                <Label htmlFor="subdomain">Workspace URL</Label>
                <div className="flex items-center rounded-md border border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 overflow-hidden transition-colors">
                  <input
                    id="subdomain"
                    value={subdomain}
                    onChange={(e) => { setSubdomainTouched(true); setSubdomain(e.target.value.toLowerCase()); }}
                    placeholder="acme"
                    required
                    pattern="^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$"
                    minLength={3}
                    maxLength={40}
                    className="flex-1 px-3 py-2 text-sm outline-none bg-white"
                  />
                  <span className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-l border-gray-200">.yourapp.com</span>
                </div>
              </motion.div>

              <motion.hr variants={item} className="border-gray-100" />

              <motion.div variants={item} className="space-y-1.5">
                <Label htmlFor="displayName">Your name</Label>
                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Doe" required />
              </motion.div>

              <motion.div variants={item} className="space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@acme.com" required />
              </motion.div>

              <motion.div variants={item} className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} />
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
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
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
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating your workspace…
                      </motion.span>
                    ) : (
                      <motion.span
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        Create workspace
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </form>
          </motion.div>
        </motion.div>

        <motion.p variants={item} className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
