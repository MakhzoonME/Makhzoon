'use client';
import { useState } from 'react';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { ArrowRight, Loader2 } from 'lucide-react';

export default function ComingSoonPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setState('loading');
    try {
      await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      // best-effort — still show success to avoid leaking errors
    }
    setState('done');
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#05070F' }}
    >
      {/* Gradient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(79,70,229,0.28) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(124,58,237,0.18) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 20% 90%, rgba(99,102,241,0.12) 0%, transparent 60%)',
        }}
      />

      {/* Subtle dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Top noise vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 50% at 50% 0%, transparent 60%, #05070F 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6" style={{ maxWidth: 680 }}>

        {/* Logo */}
        <div className="mb-10" style={{ filter: 'drop-shadow(0 0 32px rgba(99,102,241,0.5))' }}>
          <MakhzoonMark size={72} />
        </div>

        {/* Eyebrow */}
        <div
          className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase"
          style={{
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.25)',
            color: 'rgba(161,162,250,0.9)',
            letterSpacing: '0.14em',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#818CF8' }}
          />
          Something is coming
        </div>

        {/* Headline */}
        <h1
          className="font-bold mb-6"
          style={{
            fontSize: 'clamp(40px, 7vw, 72px)',
            lineHeight: 1.05,
            letterSpacing: '-0.035em',
            color: '#fff',
          }}
        >
          Asset intelligence,{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #818CF8 0%, #A78BFA 50%, #C4B5FD 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            quietly precise.
          </span>
        </h1>

        {/* Arabic */}
        <div
          className="mb-6 font-bold"
          style={{
            fontSize: 'clamp(20px, 3vw, 28px)',
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.04em',
            fontFamily: 'system-ui',
            direction: 'rtl',
          }}
        >
          مخزون — &ldquo;stored&rdquo;
        </div>

        {/* Sub */}
        <p
          className="mb-10"
          style={{
            fontSize: 18,
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.52)',
            maxWidth: 520,
          }}
        >
          We&apos;re building the asset management platform operations teams have always deserved.
          One place for everything your organization owns — from acquisition to retirement.
        </p>

        {/* Email form */}
        {state === 'done' ? (
          <div
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-medium"
            style={{
              background: 'rgba(22,163,74,0.12)',
              border: '1px solid rgba(22,163,74,0.3)',
              color: 'rgba(134,239,172,0.9)',
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: '#4ade80' }} />
            You&apos;re on the list. We&apos;ll be in touch.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex gap-2" style={{ maxWidth: 460 }}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@company.com"
              className="flex-1 min-w-0 px-4 rounded-xl text-sm outline-none"
              style={{
                height: 48,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                fontFamily: 'inherit',
              }}
            />
            <button
              type="submit"
              disabled={state === 'loading'}
              className="inline-flex items-center gap-2 px-5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                height: 48,
                background: 'var(--primary-600)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
                opacity: state === 'loading' ? 0.7 : 1,
              }}
            >
              {state === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Get early access <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>
        )}

        <p className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          No spam. Notify me when we launch.
        </p>
      </div>

      {/* Horizontal line at bottom */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.4) 50%, transparent 100%)',
        }}
      />
    </div>
  );
}
