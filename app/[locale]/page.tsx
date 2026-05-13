'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  motion, AnimatePresence,
  useMotionValue, useTransform,
  useReducedMotion,
} from 'framer-motion';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { ArrowRight, Loader2 } from 'lucide-react';

const copy = {
  en: {
    eyebrow: "Something's shifting in Arab business",
    headline: ['Everything you own, ', 'finally in its place.'],
    body: "Assets vanish. Inventory lies. Spreadsheets forget. We're building the system Arab organizations deserve — one place where everything you own is tracked, alive, and accounted for.",
    firstName: 'First name',
    lastName: 'Last name',
    email: 'your@company.com',
    cta: 'Join the waitlist',
    noSpam: "We'll reach out when it's time. No noise.",
    successTitle: "You're in.",
    successBody: "We'll find you when the doors open.",
    loginPrompt: 'Have access already?',
    loginLink: 'Sign in',
    dir: 'ltr' as const,
    cards: [
      { value: '791', label: 'assets tracked' },
      { value: '∞', label: 'real-time' },
      { value: '12 teams', label: 'one view' },
    ],
  },
  ar: {
    eyebrow: 'شي يتغيّر في عالم الأعمال العربية',
    headline: ['كل ما تملكه، ', 'في مكانه أخيراً.'],
    body: 'الأصول تضيع. المخزون يكذب. الجداول تنسى. نبني النظام اللي تستاهله المؤسسات العربية — مكان واحد، كل ما تملكه فيه متابَع وحي ومحسوب.',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    email: 'بريدك@شركتك.com',
    cta: 'انضم لقائمة الانتظار',
    noSpam: 'نتواصل معك وقت الإطلاق. بدون ضجة.',
    successTitle: 'أنت داخل.',
    successBody: 'نوصلك لما تفتح الأبواب.',
    loginPrompt: 'عندك وصول بالفعل؟',
    loginLink: 'سجّل دخول',
    dir: 'rtl' as const,
    cards: [
      { value: '٧٩١', label: 'أصل مُتابَع' },
      { value: '∞', label: 'لحظي' },
      { value: '١٢ فريق', label: 'نظرة واحدة' },
    ],
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.makhzoon.me';

const CARD_POSITIONS = [
  'left-[5%] top-[36%]',
  'right-[4%] top-[28%]',
  'right-[6%] bottom-[25%]',
];
const FLOAT_AMT      = [10, 8, 12];
const FLOAT_DUR      = [6, 8, 7];
const FLOAT_DELAY    = [0, 1.2, 0.5];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.42 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function ComingSoonPage() {
  const params  = useParams();
  const router  = useRouter();
  const reduced = useReducedMotion();
  const locale  = (params?.locale as string) === 'ar' ? 'ar' : 'en';
  const t       = copy[locale];
  const other   = locale === 'en' ? 'ar' : 'en';

  const [formState, setFormState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [revealed,  setRevealed]  = useState(false);
  const [isTouch,   setIsTouch]   = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const glowX  = useTransform(mouseX, v => v - 200);
  const glowY  = useTransform(mouseY, v => v - 200);

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
    if (reduced) { setRevealed(true); return; }
    const id = setTimeout(() => setRevealed(true), 680);
    return () => clearTimeout(id);
  }, [reduced]);

  function onMouseMove(e: React.MouseEvent) {
    if (!isTouch) { mouseX.set(e.clientX); mouseY.set(e.clientY); }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setFormState('loading');
    try {
      await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email }),
      });
    } catch { /* best-effort */ }
    setFormState('done');
  }

  return (
    <div
      dir={t.dir}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#05070F' }}
      onMouseMove={onMouseMove}
    >
      {/* Cursor glow */}
      {!isTouch && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed z-30 rounded-full"
          style={{
            x: glowX, y: glowY,
            width: 400, height: 400,
            background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)',
          }}
        />
      )}

      {/* Entrance: scan line sweeps top → bottom */}
      <AnimatePresence>
        {!revealed && (
          <motion.div
            key="scan"
            aria-hidden
            className="fixed inset-x-0 top-0 z-50 pointer-events-none"
            initial={{ y: 0 }}
            animate={{ y: '100vh' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'linear' }}
          >
            <div style={{
              height: 2,
              background: 'var(--primary-500)',
              boxShadow: '0 0 36px 10px rgba(99,102,241,0.55), 0 0 4px rgba(165,167,252,0.9)',
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entrance: black veil lifts after scan */}
      <AnimatePresence>
        {!revealed && (
          <motion.div
            key="veil"
            aria-hidden
            className="fixed inset-0 z-40 pointer-events-none"
            style={{ background: '#05070F' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Background: breathing gradient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-breathe"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% -5%, rgba(79,70,229,0.32) 0%, transparent 68%),' +
            'radial-gradient(ellipse 45% 35% at 82% 82%, rgba(124,58,237,0.2) 0%, transparent 60%),' +
            'radial-gradient(ellipse 40% 30% at 18% 92%, rgba(99,102,241,0.14) 0%, transparent 60%)',
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

      {/* Grain texture (extended so 2% shift doesn't clip) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[4%] animate-grain"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
          opacity: 0.035,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Top vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 100% 45% at 50% 0%, transparent 55%, #05070F 100%)' }}
      />

      {/* Watermark: large faint rotating logo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center animate-spin-slow"
        style={{ opacity: 0.025 }}
      >
        <MakhzoonMark size={320} />
      </div>

      {/* Language toggle */}
      <motion.button
        onClick={() => router.push(`/${other}`)}
        className="absolute top-5 end-6 z-20 text-xs font-medium px-3 py-1.5 rounded-full"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.55)',
        }}
        whileHover={{ opacity: 1 }}
        whileTap={{ scale: 0.96 }}
        initial={{ opacity: 0.7 }}
      >
        {other === 'ar' ? 'العربية' : 'English'}
      </motion.button>

      {/* Desktop floating stat cards */}
      {t.cards.map((card, i) => (
        <motion.div
          key={`dcard-${i}`}
          aria-hidden
          className={`hidden lg:block absolute ${CARD_POSITIONS[i]}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1 : 0.9 }}
          transition={{ delay: 0.25 + i * 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            animate={!reduced ? { y: [0, -FLOAT_AMT[i], 0] } : {}}
            transition={{ duration: FLOAT_DUR[i], repeat: Infinity, ease: 'easeInOut', delay: FLOAT_DELAY[i] }}
            whileHover={{ scale: 1.04, y: reduced ? 0 : -6 }}
            className="flex flex-col items-center gap-1 px-5 py-4 rounded-2xl cursor-default select-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
              minWidth: 118,
            }}
          >
            <div className="text-xl font-bold" style={{ color: 'rgba(165,167,252,0.9)', letterSpacing: '-0.02em' }}>
              {card.value}
            </div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{card.label}</div>
          </motion.div>
        </motion.div>
      ))}

      {/* Main content — staggered entrance */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center px-6 py-16"
        style={{ maxWidth: 680, width: '100%' }}
        variants={container}
        initial={reduced ? 'show' : 'hidden'}
        animate="show"
      >
        {/* Logo */}
        <motion.div
          variants={item}
          className="mb-10"
          style={{ filter: 'drop-shadow(0 0 28px rgba(99,102,241,0.45))' }}
          whileHover={{ filter: 'drop-shadow(0 0 56px rgba(99,102,241,0.75))' }}
          transition={{ duration: 0.3 }}
        >
          <MakhzoonMark size={68} />
        </motion.div>

        {/* Eyebrow */}
        <motion.div
          variants={item}
          className="cs-eyebrow inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full text-xs font-medium uppercase"
          style={{
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.22)',
            color: 'rgba(165,167,252,0.9)',
            letterSpacing: locale === 'en' ? '0.12em' : '0.04em',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: '#818CF8' }} />
          {t.eyebrow}
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={item}
          className="font-bold mb-5"
          style={{
            fontSize: 'clamp(36px, 7vw, 70px)',
            lineHeight: 1.06,
            letterSpacing: locale === 'en' ? '-0.035em' : '-0.01em',
            color: '#fff',
          }}
        >
          {t.headline[0]}
          <span style={{
            background: 'linear-gradient(135deg, #818CF8 0%, #A78BFA 50%, #C4B5FD 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}>
            {t.headline[1]}
          </span>
        </motion.h1>

        {/* Body */}
        <motion.p
          variants={item}
          className="mb-10"
          style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(255,255,255,0.5)', maxWidth: 500 }}
        >
          {t.body}
        </motion.p>

        {/* Mobile stat cards (horizontal scroll strip) */}
        <motion.div
          variants={item}
          className="flex lg:hidden gap-3 w-full overflow-x-auto mb-8 pb-1 justify-center"
          style={{ scrollbarWidth: 'none' }}
        >
          {t.cards.map((card, i) => (
            <div
              key={i}
              className="flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                minWidth: 96,
              }}
            >
              <div className="text-lg font-bold" style={{ color: 'rgba(165,167,252,0.9)' }}>{card.value}</div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{card.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Form / Success swap */}
        <motion.div variants={item} className="w-full" style={{ maxWidth: 460 }}>
          <AnimatePresence mode="wait">
            {formState === 'done' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.94, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-1.5 px-8 py-5 rounded-2xl text-center"
                style={{
                  background: 'rgba(22,163,74,0.08)',
                  border: '1px solid rgba(22,163,74,0.25)',
                }}
              >
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'rgba(134,239,172,0.95)' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <circle cx="7" cy="7" r="7" fill="rgba(22,163,74,0.3)" />
                    <path d="M4 7l2 2 4-4" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t.successTitle}
                </div>
                <p className="text-xs" style={{ color: 'rgba(134,239,172,0.65)' }}>{t.successBody}</p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={onSubmit}
                className="flex flex-col gap-3"
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex gap-3">
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder={t.firstName} className="cs-input flex-1 min-w-0 px-4 rounded-xl text-sm"
                    style={{ height: 48, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', color: '#fff', fontFamily: 'inherit', outline: 'none' }}
                  />
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder={t.lastName} className="cs-input flex-1 min-w-0 px-4 rounded-xl text-sm"
                    style={{ height: 48, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', color: '#fff', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>
                <div className="flex gap-2">
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder={t.email} className="cs-input flex-1 min-w-0 px-4 rounded-xl text-sm"
                    style={{ height: 48, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', color: '#fff', fontFamily: 'inherit', outline: 'none' }}
                  />
                  <motion.button
                    type="submit"
                    disabled={formState === 'loading'}
                    className="inline-flex items-center gap-2 px-5 rounded-xl text-sm font-semibold flex-shrink-0"
                    style={{
                      height: 48,
                      background: 'linear-gradient(135deg, var(--primary-600), var(--primary-500))',
                      color: '#fff', border: 'none', cursor: 'pointer',
                      opacity: formState === 'loading' ? 0.65 : 1,
                    }}
                    whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                  >
                    {formState === 'loading'
                      ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                      : <><span>{t.cta}</span><ArrowRight className="h-4 w-4" strokeWidth={1.75} /></>}
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.p variants={item} className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.22)' }}>
          {t.noSpam}
        </motion.p>

        <motion.p variants={item} className="mt-6 text-sm" style={{ color: 'rgba(255,255,255,0.38)' }}>
          {t.loginPrompt}{' '}
          <a
            href={`${APP_URL}/${locale}/login`}
            className="font-medium transition-colors"
            style={{ color: 'rgba(165,167,252,0.85)' }}
            onMouseEnter={e => ((e.target as HTMLAnchorElement).style.color = 'rgba(165,167,252,1)')}
            onMouseLeave={e => ((e.target as HTMLAnchorElement).style.color = 'rgba(165,167,252,0.85)')}
          >
            {t.loginLink}
          </a>
        </motion.p>
      </motion.div>

      {/* Bottom gradient line */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.45) 50%, transparent 100%)' }}
      />
    </div>
  );
}
