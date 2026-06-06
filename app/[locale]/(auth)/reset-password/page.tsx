'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageToggle } from '@/components/shared/LanguageToggle';

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

function Loader2SVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="animate-spin">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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

function AlertCircleSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M8 5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const params = useParams<{ locale: string }>();
  const router = useRouter();
  const locale = params.locale ?? 'en';
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace(`/${locale}/login`);
    }
  }, [token, locale, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Failed to reset password. The link may have expired.');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-page px-4 relative">
      <div className="absolute top-4 end-4 flex items-center gap-1">
        <LanguageToggle variant="ghost-light" />
        <ThemeToggle variant="ghost-light" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-2.5 mb-8">
          <MakhzoonMark size={36} radius={9} />
          <span className="text-lg font-bold text-gray-900" style={{ letterSpacing: '-0.01em' }}>
            Makhzoon
          </span>
        </div>

        <div
          className="bg-surface-card border border-border rounded-2xl shadow-md p-7"
        >
          <AnimatePresence mode="wait" initial={false}>
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-4 gap-4"
              >
                <span className="text-primary-600"><CheckCircleSVG /></span>
                <h1 className="text-lg font-semibold text-gray-900">Password updated</h1>
                <p className="text-sm text-gray-500">Your password has been reset. You can now sign in with your new password.</p>
                <Button className="mt-2 w-full" onClick={() => router.push(`/${locale}/login`)}>
                  Back to sign in
                </Button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 1 }}>
                <h1 className="text-lg font-semibold text-gray-900 mb-1">Set new password</h1>
                <p className="text-sm text-gray-500 mb-5">Enter a new password for your account.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">New password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Min. 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOffSVG /> : <EyeSVG />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirm password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Repeat password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        onClick={() => setShowConfirm(!showConfirm)}
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      >
                        {showConfirm ? <EyeOffSVG /> : <EyeSVG />}
                      </button>
                    </div>
                  </div>
                  <AnimatePresence initial={false}>
                    {error && (
                      <motion.div
                        key="err"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5"
                      >
                        <AlertCircleSVG /><span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading
                      ? <span className="inline-flex items-center gap-2"><Loader2SVG />Updating…</span>
                      : 'Set new password'}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Remember your password?{' '}
          <a href={`/${locale}/login`} className="text-primary-600 font-medium hover:text-primary-700 transition-colors underline-offset-2 hover:underline">
            Sign in
          </a>
        </p>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
