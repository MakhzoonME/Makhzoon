'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { ArrowRight, Loader2 } from 'lucide-react';

const copy = {
  en: {
    eyebrow: 'Business OS for Arab organizations',
    headline: ['أدير عملك ', 'في مكان واحد.'],
    subtitle: 'Makhzoon — مخزون',
    body: "We're building the Business OS for Arab organizations. Assets, inventory, sales, and finance — five modules that work together so your team doesn't have to juggle spreadsheets.",
    firstName: 'First name',
    lastName: 'Last name',
    email: 'your@company.com',
    cta: 'Get early access',
    noSpam: 'No spam. Notify me when we launch.',
    success: "You're on the list. We'll be in touch.",
    loginPrompt: 'Already have access?',
    loginLink: 'Login',
    dir: 'ltr' as const,
  },
  ar: {
    eyebrow: 'نظام تشغيل الأعمال للمؤسسات العربية',
    headline: ['أدير عملك ', 'في مكان واحد.'],
    subtitle: 'مخزون — Makhzoon',
    body: 'نبني نظام تشغيل الأعمال للمؤسسات العربية. أصول، رصيد، حركة، مال — خمسة وحدات تعمل معاً حتى لا يضطر فريقك للعمل بجداول البيانات.',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    email: 'بريدك@شركتك.com',
    cta: 'احصل على وصول مبكر',
    noSpam: 'لا بريد عشوائي. سنخبرك عند الإطلاق.',
    success: 'أنت في القائمة. سنتواصل معك.',
    loginPrompt: 'لديك وصول بالفعل؟',
    loginLink: 'تسجيل الدخول',
    dir: 'rtl' as const,
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.makhzoon.me';

export default function ComingSoonPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) === 'ar' ? 'ar' : 'en';
  const t = copy[locale];

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
        body: JSON.stringify({ firstName, lastName, email }),
      });
    } catch {
      // best-effort — still show success
    }
    setState('done');
  }

  const otherLocale = locale === 'en' ? 'ar' : 'en';

  return (
    <div
      dir={t.dir}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#05070F' }}
    >
      {/* Gradient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% -5%, rgba(79,70,229,0.32) 0%, transparent 68%), radial-gradient(ellipse 45% 35% at 82% 82%, rgba(124,58,237,0.2) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 18% 92%, rgba(99,102,241,0.14) 0%, transparent 60%)',
        }}
      />

      {/* Dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      {/* Top vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 100% 45% at 50% 0%, transparent 55%, #05070F 100%)' }}
      />

      {/* Language toggle */}
      <button
        onClick={() => router.push(`/${otherLocale}`)}
        className="absolute top-5 end-6 z-20 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        {otherLocale === 'ar' ? 'العربية' : 'English'}
      </button>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 py-16" style={{ maxWidth: 680 }}>

        {/* Logo */}
        <div className="mb-10" style={{ filter: 'drop-shadow(0 0 36px rgba(99,102,241,0.55))' }}>
          <MakhzoonMark size={68} />
        </div>

        {/* Eyebrow */}
        <div
          className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase"
          style={{
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.22)',
            color: 'rgba(165,167,252,0.9)',
            letterSpacing: locale === 'en' ? '0.14em' : '0.04em',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#818CF8' }} />
          {t.eyebrow}
        </div>

        {/* Headline */}
        <h1
          className="font-bold mb-5"
          style={{
            fontSize: 'clamp(38px, 7vw, 70px)',
            lineHeight: 1.06,
            letterSpacing: locale === 'en' ? '-0.035em' : '-0.01em',
            color: '#fff',
          }}
        >
          {t.headline[0]}
          <span
            style={{
              background: 'linear-gradient(135deg, #818CF8 0%, #A78BFA 50%, #C4B5FD 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {t.headline[1]}
          </span>
        </h1>

        {/* Subtitle (brand name) */}
        <div
          className="mb-6 font-bold"
          style={{
            fontSize: 'clamp(18px, 3vw, 26px)',
            color: 'rgba(255,255,255,0.18)',
            letterSpacing: '0.04em',
            fontFamily: 'system-ui',
          }}
        >
          {t.subtitle}
        </div>

        {/* Body */}
        <p
          className="mb-10"
          style={{
            fontSize: 17,
            lineHeight: 1.65,
            color: 'rgba(255,255,255,0.5)',
            maxWidth: 500,
          }}
        >
          {t.body}
        </p>

        {/* Email form */}
        {state === 'done' ? (
          <div
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-medium"
            style={{
              background: 'rgba(22,163,74,0.1)',
              border: '1px solid rgba(22,163,74,0.28)',
              color: 'rgba(134,239,172,0.9)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <circle cx="7" cy="7" r="7" fill="rgba(22,163,74,0.3)" />
              <path d="M4 7l2 2 4-4" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t.success}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3" style={{ maxWidth: 460 }}>
            <div className="flex gap-3">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t.firstName}
                className="flex-1 min-w-0 px-4 rounded-xl text-sm outline-none"
                style={{
                  height: 48,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.11)',
                  color: '#fff',
                  fontFamily: 'inherit',
                }}
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t.lastName}
                className="flex-1 min-w-0 px-4 rounded-xl text-sm outline-none"
                style={{
                  height: 48,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.11)',
                  color: '#fff',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.email}
                className="flex-1 min-w-0 px-4 rounded-xl text-sm outline-none"
                style={{
                  height: 48,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.11)',
                  color: '#fff',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="submit"
                disabled={state === 'loading'}
                className="inline-flex items-center gap-2 px-5 rounded-xl text-sm font-semibold transition-opacity duration-200"
                style={{
                  height: 48,
                  background: 'var(--primary-600)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                  opacity: state === 'loading' ? 0.65 : 1,
                }}
              >
                {state === 'loading'
                  ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                  : <><span>{t.cta}</span><ArrowRight className="h-4 w-4" strokeWidth={1.75} /></>}
              </button>
            </div>
          </form>
        )}

        <p className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.22)' }}>
          {t.noSpam}
        </p>

        <p className="mt-6 text-sm" style={{ color: 'rgba(255,255,255,0.38)' }}>
          {t.loginPrompt}{' '}
          <a
            href={`${APP_URL}/${locale}/login`}
            className="font-medium transition-colors"
            style={{ color: 'rgba(165,167,252,0.85)' }}
            onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = 'rgba(165,167,252,1)')}
            onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = 'rgba(165,167,252,0.85)')}
          >
            {t.loginLink}
          </a>
        </p>
      </div>

      {/* Bottom gradient line */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.45) 50%, transparent 100%)' }}
      />
    </div>
  );
}
