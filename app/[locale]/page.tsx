'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  motion, AnimatePresence,
  useMotionValue, useTransform,
  useReducedMotion,
} from 'framer-motion';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { ArrowRight, Loader2, Check } from 'lucide-react';

/* ── Copy ─────────────────────────────────────────────────────────── */
const copy = {
  en: {
    eyebrow:      "Something's shifting in Arab business",
    headline:     ['Everything you own, ', 'finally in its place.'],
    body:         "Assets vanish. Inventory lies. Spreadsheets forget. We're building the system Arab organizations deserve — one place where everything you own is tracked, alive, and accounted for.",
    firstName:    'First name',
    lastName:     'Last name',
    email:        'your@company.com',
    cta:          'Join the waitlist',
    noSpam:       "We'll reach out when it's time. No noise.",
    successTitle: "You're in.",
    successBody:  "We'll find you when the doors open.",
    loginPrompt:  'Have access already?',
    loginLink:    'Sign in',
    trust:        'Organizations across the Arab world are already on the waitlist',
    dir:          'ltr' as const,
    cards: [
      { value: '791',     label: 'assets tracked' },
      { value: '∞',       label: 'real-time',      faded: true },
      { value: '12 teams', label: 'one view' },
    ],
  },
  ar: {
    eyebrow:      'شيءٌ ما يتغيّر في أعمال المنطقة',
    headline:     ['كل ما تملكه، ', 'أخيرًا في مكانه.'],
    body:         'الأصول تختفي. المخزون يكذب. الجداول تنسى. نبني النظام الذي تستحقه المنشآت العربية — مكانٌ واحد يبقى فيه كل ما تملكه متتبَّعًا وحيًّا ومحسوبًا.',
    firstName:    'الاسم الأول',
    lastName:     'اسم العائلة',
    email:        'بريدك@شركتك.com',
    cta:          'انضمّ لقائمة الانتظار',
    noSpam:       'سنتواصل معك في الوقت المناسب. بلا إزعاج.',
    successTitle: 'أنت في القائمة.',
    successBody:  'سنوصلك حين تُفتح الأبواب.',
    loginPrompt:  'لديك حساب بالفعل؟',
    loginLink:    'سجّل الدخول',
    trust:        'منشآت من أرجاء العالم العربي على قائمة الانتظار',
    dir:          'rtl' as const,
    cards: [
      { value: '٧٩١',     label: 'أصل مُتتبَّع' },
      { value: '∞',       label: 'لحظيًا',           faded: true },
      { value: '١٢ فريقًا', label: 'مشهد واحد' },
    ],
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.makhzoon.me';

/* ── Card positions — desktop floating ───────────────────────────── */
const CARD_POS = [
  { side: 'left-[5%]',  top: 'top-[33%]' },
  { side: 'right-[4%]', top: 'top-[22%]' },
  { side: 'right-[5%]', top: 'bottom-[24%]' },
];
const FLOAT = { amt: [10, 8, 12], dur: [6.5, 8, 7.2], delay: [0, 1.4, 0.6] };

/* ── Framer variants ─────────────────────────────────────────────── */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.44 } },
};
const item = {
  hidden: { opacity: 0, y: 12, filter: 'blur(4px)' },
  show:   { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

/* ── Palette constants ───────────────────────────────────────────── */
const C = {
  bg:       '#05070F',
  ink0:     '#ffffff',
  ink1:     '#e8e9f7',
  ink2:     '#9598bf',
  ink3:     '#5b5e82',
  glass:    'rgba(255,255,255,0.035)',
  line:     'rgba(255,255,255,0.07)',
  lineHard: 'rgba(255,255,255,0.13)',
  indigo:   '#6366F1',
  violet:   '#A78BFA',
  pink:     '#F472B6',
  violet2:  '#C4B5FD',
};

export default function ComingSoonPage() {
  const params   = useParams();
  const router   = useRouter();
  const reduced  = useReducedMotion();
  const locale   = (params?.locale as string) === 'ar' ? 'ar' : 'en';
  const t        = copy[locale];
  const other    = locale === 'en' ? 'ar' : 'en';

  const [formState, setFormState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [revealed,  setRevealed]  = useState(false);
  const [isTouch,   setIsTouch]   = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const glowX  = useTransform(mouseX, v => v - 240);
  const glowY  = useTransform(mouseY, v => v - 240);

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
    if (reduced) { setRevealed(true); return; }
    const id = setTimeout(() => setRevealed(true), 660);
    return () => clearTimeout(id);
  }, [reduced]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isTouch) { mouseX.set(e.clientX); mouseY.set(e.clientY); }
  }, [isTouch, mouseX, mouseY]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setFormState('loading');
    try {
      await fetch('/api/early-access', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ firstName, lastName, email }),
      });
    } catch { /* best-effort */ }
    setFormState('done');
  }

  return (
    <div
      dir={t.dir}
      className="relative min-h-screen flex flex-col overflow-hidden select-none"
      style={{ background: C.bg }}
      onMouseMove={onMouseMove}
    >

      {/* ── Cursor glow ──────────────────────────────────────────── */}
      {!isTouch && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed z-30 rounded-full"
          style={{
            top: 0, left: 0,
            x: glowX, y: glowY,
            width: 480, height: 480,
            background: `radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 65%)`,
          }}
        />
      )}

      {/* ── Entrance: scan line ──────────────────────────────────── */}
      <AnimatePresence>
        {!revealed && (
          <motion.div
            key="scan"
            aria-hidden
            className="fixed inset-x-0 top-0 z-50 pointer-events-none"
            initial={{ y: 0 }}
            animate={{ y: '100vh' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.52, ease: 'linear' }}
          >
            <div style={{
              height: 2,
              background: 'var(--primary-500)',
              boxShadow: '0 0 40px 12px rgba(99,102,241,0.6), 0 0 4px rgba(165,167,252,1)',
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Entrance: veil ───────────────────────────────────────── */}
      <AnimatePresence>
        {!revealed && (
          <motion.div
            key="veil"
            aria-hidden
            className="fixed inset-0 z-40 pointer-events-none"
            style={{ background: C.bg }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* ── Background: 3 drifting orbs ──────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Orb 1 — indigo, left */}
        <div
          className="cs-orb-1 absolute rounded-full"
          style={{
            width: 600, height: 600,
            left: '-12%', top: '2%',
            background: `radial-gradient(circle, rgba(79,70,229,0.22) 0%, transparent 60%)`,
            filter: 'blur(1px)',
          }}
        />
        {/* Orb 2 — violet, right */}
        <div
          className="cs-orb-2 absolute rounded-full"
          style={{
            width: 520, height: 520,
            right: '-10%', top: '6%',
            background: `radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 60%)`,
            filter: 'blur(1px)',
          }}
        />
        {/* Orb 3 — pink, bottom center */}
        <div
          className="cs-orb-3 absolute rounded-full"
          style={{
            width: 420, height: 420,
            left: '32%', bottom: '-14%',
            opacity: 0.3,
            background: `radial-gradient(circle, rgba(244,114,182,0.20) 0%, transparent 60%)`,
            filter: 'blur(1px)',
          }}
        />
        {/* Top aurora — large soft gradient */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: '55%',
            background: `radial-gradient(ellipse 85% 55% at 50% -5%, rgba(79,70,229,0.28) 0%, transparent 65%)`,
          }}
        />
      </div>

      {/* ── Dot grid ─────────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.048) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      />

      {/* ── Grain texture ────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[4%] animate-grain"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
          opacity: 0.032,
          mixBlendMode: 'overlay',
        }}
      />

      {/* ── Vignette top ─────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse 110% 42% at 50% 0%, transparent 50%, ${C.bg} 100%)` }}
      />

      {/* ── Shooting star ────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="cs-shoot absolute"
          style={{
            top: '18%', left: 0,
            width: 3, height: 3,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 0 6px 2px rgba(255,255,255,0.55)',
          }}
        >
          <span style={{
            position: 'absolute',
            right: '100%', top: '50%',
            width: 90, height: 1,
            transform: 'translateY(-50%)',
            background: `linear-gradient(to left, rgba(255,255,255,0.5), transparent)`,
          }} />
        </div>
      </div>

      {/* ── Watermark — slow-rotating mark ───────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center animate-spin-slow"
        style={{ opacity: 0.022 }}
      >
        <MakhzoonMark size={340} />
      </div>

      {/* ── Language toggle ──────────────────────────────────────── */}
      <motion.button
        onClick={() => router.push(`/${other}`)}
        className="absolute top-5 end-6 z-20 text-xs font-medium px-3.5 py-2 rounded-full"
        style={{
          background: 'rgba(255,255,255,0.055)',
          border:     `1px solid ${C.lineHard}`,
          color:      C.ink3,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.06em',
        }}
        whileHover={{ color: C.ink1, borderColor: 'rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.09)' }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.18 }}
      >
        {other === 'ar' ? 'العربية' : 'English'}
      </motion.button>

      {/* ── Desktop floating stat cards ──────────────────────────── */}
      {t.cards.map((card, i) => (
        <motion.div
          key={`card-${i}`}
          aria-hidden
          className={`hidden lg:block absolute ${CARD_POS[i].side} ${CARD_POS[i].top}`}
          initial={{ opacity: 0, scale: 0.88, y: 8 }}
          animate={{ opacity: revealed ? (card.faded ? 0.52 : 1) : 0, scale: revealed ? 1 : 0.88, y: revealed ? 0 : 8 }}
          transition={{ delay: 0.3 + i * 0.16, duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            animate={!reduced ? { y: [0, -FLOAT.amt[i], 0] } : {}}
            transition={{ duration: FLOAT.dur[i], repeat: Infinity, ease: 'easeInOut', delay: FLOAT.delay[i] }}
            whileHover={{ scale: 1.05, opacity: 1 }}
            className="flex flex-col items-center px-6 py-4 rounded-2xl cursor-default"
            style={{
              background:     C.glass,
              border:         `1px solid ${C.line}`,
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              boxShadow:      '0 16px 48px -12px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)',
              minWidth: 124,
            }}
          >
            <div
              className="text-2xl font-bold tabular-nums"
              style={{ color: 'rgba(196,181,253,0.92)', letterSpacing: '-0.02em', lineHeight: 1 }}
            >
              {card.value}
            </div>
            <div
              className="mt-1.5 text-xs uppercase tracking-widest"
              style={{ color: C.ink3, fontFamily: 'var(--font-mono)', fontSize: 10 }}
            >
              {card.label}
            </div>
          </motion.div>
        </motion.div>
      ))}

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col flex-1 items-center justify-center px-5 py-20">
        <motion.div
          className="flex flex-col items-center text-center w-full"
          style={{ maxWidth: 720 }}
          variants={container}
          initial={reduced ? 'show' : 'hidden'}
          animate="show"
        >

          {/* Brand mark — animated glow ring */}
          <motion.div variants={item} className="mb-9 relative" style={{ width: 80, height: 80 }}>
            {/* Hue-rotating glow ring */}
            <div
              aria-hidden
              className="cs-huerot absolute rounded-[22px]"
              style={{
                inset: -3, zIndex: -1,
                background: `linear-gradient(135deg, ${C.indigo}, ${C.violet}, ${C.pink}, ${C.indigo})`,
                backgroundSize: '300% 300%',
                filter: 'blur(12px)',
                opacity: 0.6,
              }}
            />
            {/* Icon container */}
            <motion.div
              className="relative rounded-[20px] flex items-center justify-center"
              style={{
                width: 80, height: 80,
                background: `linear-gradient(145deg, #5558E8 0%, #7579F5 100%)`,
                boxShadow: `0 0 80px rgba(99,102,241,0.5), 0 24px 64px -12px rgba(99,102,241,0.45), inset 0 0 0 1px rgba(255,255,255,0.2)`,
              }}
              animate={!reduced ? { y: [0, -6, 0] } : {}}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <MakhzoonMark size={44} fill="transparent" glyphFill="#ffffff" />
            </motion.div>
          </motion.div>

          {/* Eyebrow badge */}
          <motion.div
            variants={item}
            className="cs-eyebrow inline-flex items-center gap-2.5 mb-8 px-5 py-2 rounded-full"
            style={{
              background:    'rgba(99,102,241,0.09)',
              border:        '1px solid rgba(129,140,248,0.28)',
              color:         C.violet2,
              fontSize:      locale === 'ar' ? 13.5 : 11,
              letterSpacing: locale === 'en' ? '0.14em' : '0.02em',
              fontFamily:    locale === 'en' ? 'var(--font-mono)' : 'inherit',
              fontWeight:    500,
              textTransform: locale === 'en' ? 'uppercase' as const : 'none' as const,
              position:      'relative',
              overflow:      'hidden',
            }}
          >
            {/* Shimmer sweep — auto-running */}
            <span
              aria-hidden
              className="cs-shimmer pointer-events-none absolute inset-0"
              style={{
                background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.14) 50%, transparent 65%)',
                borderRadius: 'inherit',
              }}
            />
            {/* Blinking dot */}
            <span
              className="cs-blink flex-shrink-0 rounded-full"
              style={{ width: 7, height: 7, background: C.violet2, boxShadow: `0 0 8px ${C.violet2}` }}
            />
            <span style={{ position: 'relative' }}>{t.eyebrow}</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={item}
            className="font-bold mb-6 text-balance"
            style={{
              fontSize:      'clamp(38px, 7.5vw, 72px)',
              lineHeight:    locale === 'ar' ? 1.22 : 1.04,
              letterSpacing: locale === 'en' ? '-0.035em' : '-0.01em',
              color:         C.ink0,
              fontFamily:    locale === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
            }}
          >
            {t.headline[0]}
            <span
              className="cs-gradslide"
              style={{
                background:          `linear-gradient(110deg, ${C.violet2} 10%, #818CF8 50%, ${C.violet} 90%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip:       'text',
                color:                'transparent',
                display:              'inline',
              }}
            >
              {t.headline[1]}
            </span>
          </motion.h1>

          {/* Body */}
          <motion.p
            variants={item}
            className="mb-10 text-balance"
            style={{
              fontSize:   locale === 'ar' ? 17 : 16.5,
              lineHeight: locale === 'ar' ? 1.85 : 1.65,
              color:      C.ink2,
              maxWidth:   540,
            }}
          >
            {t.body}
          </motion.p>

          {/* Mobile stat cards — horizontal strip */}
          <motion.div
            variants={item}
            className="flex lg:hidden gap-3 w-full overflow-x-auto mb-9 pb-1 justify-center"
            style={{ scrollbarWidth: 'none' }}
          >
            {t.cards.map((card, i) => (
              <div
                key={i}
                className="flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-xl"
                style={{
                  background:     C.glass,
                  border:         `1px solid ${C.line}`,
                  backdropFilter: 'blur(10px)',
                  minWidth: 90,
                  opacity: card.faded ? 0.55 : 1,
                }}
              >
                <div className="text-lg font-bold" style={{ color: 'rgba(196,181,253,0.9)', letterSpacing: '-0.015em' }}>{card.value}</div>
                <div className="mt-1 text-xs" style={{ color: C.ink3 }}>{card.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Waitlist form */}
          <motion.div variants={item} className="w-full" style={{ maxWidth: 560 }}>
            <AnimatePresence mode="wait">
              {formState === 'done' ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.93, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.93 }}
                  transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center gap-2 px-8 py-6 rounded-2xl text-center"
                  style={{
                    background: 'rgba(22,163,74,0.07)',
                    border:     '1px solid rgba(22,163,74,0.22)',
                    boxShadow:  '0 0 40px -10px rgba(22,163,74,0.15)',
                  }}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full mb-1"
                    style={{ background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(74,222,128,0.25)' }}>
                    <Check size={18} strokeWidth={2} style={{ color: '#4ade80' }} />
                  </div>
                  <div className="font-semibold text-sm" style={{ color: 'rgba(134,239,172,0.95)' }}>
                    {t.successTitle}
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(134,239,172,0.6)' }}>{t.successBody}</p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={onSubmit}
                  className="flex flex-col gap-3"
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Name row */}
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder={t.firstName}
                      className="cs-input px-4 text-sm rounded-2xl"
                      style={{
                        height: 52,
                        background: 'rgba(255,255,255,0.055)',
                        border:     `1px solid ${C.lineHard}`,
                        color:      C.ink0,
                        fontFamily: 'inherit',
                        outline:    'none',
                        transition: 'border-color 0.18s, box-shadow 0.18s',
                      }}
                    />
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder={t.lastName}
                      className="cs-input px-4 text-sm rounded-2xl"
                      style={{
                        height: 52,
                        background: 'rgba(255,255,255,0.055)',
                        border:     `1px solid ${C.lineHard}`,
                        color:      C.ink0,
                        fontFamily: 'inherit',
                        outline:    'none',
                        transition: 'border-color 0.18s, box-shadow 0.18s',
                      }}
                    />
                  </div>

                  {/* Email + CTA row */}
                  <div className="flex gap-3">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t.email}
                      className="cs-input flex-1 min-w-0 px-4 text-sm rounded-2xl"
                      style={{
                        height: 52,
                        background: 'rgba(255,255,255,0.055)',
                        border:     `1px solid ${C.lineHard}`,
                        color:      C.ink0,
                        fontFamily: 'inherit',
                        outline:    'none',
                        transition: 'border-color 0.18s, box-shadow 0.18s',
                      }}
                    />
                    <motion.button
                      type="submit"
                      disabled={formState === 'loading'}
                      className="inline-flex items-center gap-2.5 px-6 rounded-2xl text-sm font-semibold flex-shrink-0 relative overflow-hidden"
                      style={{
                        height:     52,
                        background: `linear-gradient(135deg, #5558E8 0%, #7579F5 50%, #8B8EF8 100%)`,
                        backgroundSize: '200% 100%',
                        color:      '#fff',
                        border:     'none',
                        cursor:     formState === 'loading' ? 'not-allowed' : 'pointer',
                        opacity:    formState === 'loading' ? 0.65 : 1,
                        boxShadow:  '0 8px 28px -6px rgba(99,102,241,0.6), inset 0 1px 0 rgba(255,255,255,0.2)',
                        whiteSpace: 'nowrap',
                      }}
                      whileHover={{ scale: formState === 'loading' ? 1 : 1.02, boxShadow: '0 12px 36px -6px rgba(99,102,241,0.75), inset 0 1px 0 rgba(255,255,255,0.2)' }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ duration: 0.16 }}
                    >
                      {/* Button shimmer */}
                      <span aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                        <span
                          className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)',
                            transform:  'translateX(-100%)',
                            transition: 'transform 0.55s ease',
                          }}
                        />
                      </span>
                      {formState === 'loading'
                        ? <Loader2 size={16} className="animate-spin" strokeWidth={2} />
                        : (
                          <>
                            <span>{t.cta}</span>
                            <ArrowRight size={15} strokeWidth={2.2} style={{ transform: locale === 'ar' ? 'scaleX(-1)' : 'none' }} />
                          </>
                        )}
                    </motion.button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* No-spam line */}
          <motion.div
            variants={item}
            className="mt-4 flex items-center justify-center gap-2 text-xs"
            style={{ color: C.ink3 }}
          >
            <span
              className="cs-pulse flex-shrink-0 rounded-full"
              style={{ width: 6, height: 6, background: '#4ade80', display: 'inline-block' }}
            />
            {t.noSpam}
          </motion.div>

          {/* Sign-in link */}
          <motion.p
            variants={item}
            className="mt-7 text-sm"
            style={{ color: C.ink3 }}
          >
            {t.loginPrompt}{' '}
            <a
              href={`${APP_URL}/${locale}/login`}
              className="font-medium transition-colors duration-150"
              style={{ color: C.violet2 }}
              onMouseEnter={e => ((e.target as HTMLAnchorElement).style.color = C.ink0)}
              onMouseLeave={e => ((e.target as HTMLAnchorElement).style.color = C.violet2)}
            >
              {t.loginLink}
            </a>
          </motion.p>

          {/* Trust line */}
          <motion.div
            variants={item}
            className="mt-10 flex items-center gap-3"
            style={{ color: C.ink3, fontSize: 12 }}
          >
            <span style={{ flex: 1, height: 1, background: `linear-gradient(to ${locale === 'ar' ? 'left' : 'right'}, transparent, ${C.lineHard})`, maxWidth: 60 }} />
            <span style={{ opacity: 0.7 }}>{t.trust}</span>
            <span style={{ flex: 1, height: 1, background: `linear-gradient(to ${locale === 'ar' ? 'right' : 'left'}, transparent, ${C.lineHard})`, maxWidth: 60 }} />
          </motion.div>

        </motion.div>
      </div>

      {/* ── Bottom gradient line ──────────────────────────────────── */}
      <div
        aria-hidden
        className="absolute bottom-0 inset-x-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.5) 50%, transparent 100%)` }}
      />

    </div>
  );
}
