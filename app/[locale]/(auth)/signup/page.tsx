'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { ArrowRight } from 'lucide-react';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { buildOrgPath, buildSuperAdminPath } from '@/lib/utils/tenant-url';
import { useAuthStore } from '@/store/auth.store';
import { analytics } from '@/lib/analytics';

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const _EASE_SPRING = [0.34, 1.56, 0.64, 1] as const;

export default function SignupPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? 'en';
  const { user, loading: authLoading } = useAuthStore();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace(`/${locale}/login`); return; }
    if (SUPERADMIN_ROLES.has(user.role)) return; // super_admin family can use this page
    // Org users should not be here — send them to their portal
    if (user.orgSlug) {
      router.replace(buildOrgPath(locale, user.orgSlug, '/dashboard'));
    } else {
      router.replace(buildSuperAdminPath(locale, '/dashboard'));
    }
  }, [user, authLoading, router, locale]);

  const [orgName, setOrgName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [emailExists, setEmailExists] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const shakeControls = useAnimation();

  function deriveSubdomain(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  }

  function handleOrgName(v: string) {
    setOrgName(v);
    setSubdomain(deriveSubdomain(v));
  }

  async function checkEmail(value: string) {
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return;
    setEmailChecking(true);
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value.trim() }),
      });
      const { exists } = await res.json().catch(() => ({ exists: false }));
      setEmailExists(!!exists);
    } catch {
      // silent — don't block the form on a network blip
    } finally {
      setEmailChecking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (emailExists) return;
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

      const supabase = await createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!sessionRes.ok) throw new Error('Session creation failed');
      analytics.track('user_signed_up', { org_slug: subdomain });
      window.location.href = buildOrgPath(locale, subdomain, '/dashboard');
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
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden bg-surface-page">

      {/* Dot-field background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(79,70,229,0.10) 1px, transparent 1px)`,
          backgroundSize: '22px 22px',
          opacity: 0.7,
        }}
      />

      {/* Logo — top-left, pinned */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="absolute top-6 start-7 flex items-center gap-2.5"
      >
        <MakhzoonMark size={30} radius={7} />
        <span className="text-sm font-bold text-gray-900" style={{ letterSpacing: '-0.01em' }}>
          Makhzoon<span className="text-gray-400 font-medium">·ME</span>
        </span>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative w-full"
        style={{ maxWidth: 460 }}
      >
        {/* Headline — above card */}
        <div className="mb-6">
          <motion.h1
            variants={item}
            className="font-extrabold text-gray-900 tracking-tight"
            style={{ fontSize: 22, fontFamily: 'var(--font-display)' }}
          >
            Create your workspace
          </motion.h1>
          <motion.p variants={item} className="text-sm text-gray-500 mt-1 leading-snug">
            Run your whole business in one place. No spreadsheets.
          </motion.p>
        </div>

        <motion.div animate={shakeControls}>
          <motion.div
            variants={item}
            className="bg-surface-card border border-border"
            style={{ borderRadius: 14, boxShadow: 'var(--shadow-lg)', padding: 34 }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Organization name */}
              <motion.div variants={item} className="space-y-1.5">
                <Label htmlFor="orgName">Organization name <span className="text-red-500">*</span></Label>
                <Input id="orgName" value={orgName} onChange={(e) => handleOrgName(e.target.value)} placeholder="Acme Corp" required />
              </motion.div>

              {/* Name + Industry — 2-column */}
              <motion.div variants={item} className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">Your name <span className="text-red-500">*</span></Label>
                  <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Layla Hadid" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="industry">Industry</Label>
                  <select
                    id="industry"
                    className="w-full h-9 rounded-md border border-border bg-surface-card px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                  >
                    <option value="">Select…</option>
                    <option value="technology">Technology</option>
                    <option value="retail">Retail</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="education">Education</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </motion.div>

              {/* Work email */}
              <motion.div variants={item} className="space-y-1.5">
                <Label htmlFor="email">Work email <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailExists(false); }}
                  onBlur={(e) => checkEmail(e.target.value)}
                  placeholder="layla@acme.com"
                  required
                  className={emailExists ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''}
                />
                {emailChecking && (
                  <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden className="animate-spin">
                      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
                      <path d="M6 1.5a4.5 4.5 0 0 1 4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Checking…
                  </p>
                )}
                {emailExists && !emailChecking && (
                  <p className="text-xs text-red-600 flex items-center gap-1.5 mt-1">
                    <AlertCircleSVG />
                    An account with this email already exists.{' '}
                    <a href={`/${locale}/login`} className="font-medium underline underline-offset-2 hover:text-red-700 transition-colors">
                      Sign in instead?
                    </a>
                  </p>
                )}
              </motion.div>

              {/* Password */}
              <motion.div variants={item} className="space-y-1.5">
                <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="········" required minLength={8} />
                <p className="text-xs text-gray-400 mt-1">At least 8 characters.</p>
              </motion.div>

              <AnimatePresence initial={false}>
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, height: 0, y: -4 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -4 }}
                    transition={{ duration: 0.22, ease: EASE_OUT }}
                    className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5"
                  >
                    <AlertCircleSVG />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div variants={item}>
                <Button type="submit" className="w-full gap-2" disabled={loading || emailExists || emailChecking}>
                  <AnimatePresence mode="wait" initial={false}>
                    {loading ? (
                      <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }} className="inline-flex items-center gap-2">
                        <Loader2SVG />Creating your workspace…
                      </motion.span>
                    ) : (
                      <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }} className="inline-flex items-center gap-2">
                        Create workspace <ArrowRight size={15} strokeWidth={2.2} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </form>
          </motion.div>
        </motion.div>

        <motion.p variants={item} className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{' '}
          <Link href={`/${locale}/login`} className="font-medium text-primary-600 hover:text-primary-700 transition-colors">
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
