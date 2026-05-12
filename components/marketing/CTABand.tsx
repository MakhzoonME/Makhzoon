'use client';
import { useParams } from 'next/navigation';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.makhzoon.me';

interface CTABandProps {
  title?: string;
  sub?: string;
}

export function CTABand({
  title = 'Stop tracking assets in spreadsheets.',
  sub = 'Start your 14-day free trial. No credit card required.',
}: CTABandProps) {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';

  return (
    <section
      className="relative overflow-hidden px-4 sm:px-8 py-16 sm:py-20"
      style={{
        background: 'radial-gradient(at 20% 30%, #6366F1 0%, transparent 60%), radial-gradient(at 80% 70%, #7C3AED 0%, transparent 60%), var(--primary-600)',
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.4,
        }}
      />
      <div className="relative text-center mx-auto" style={{ maxWidth: 880, color: '#fff' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, margin: '0 0 14px' }}>{title}</h2>
        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.85)', margin: '0 0 28px' }}>{sub}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={`${APP_URL}/${locale}/login`}
            className="inline-flex items-center justify-center px-6 h-11 rounded-lg font-medium no-underline transition-colors duration-150"
            style={{ background: '#fff', color: 'var(--primary-700)', textDecoration: 'none', fontSize: 15 }}
          >
            Start free trial
          </a>
          <a
            href={`/${locale}/contact`}
            className="inline-flex items-center justify-center px-6 h-11 rounded-lg font-medium no-underline transition-colors duration-150"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', textDecoration: 'none', fontSize: 15 }}
          >
            Book a demo
          </a>
        </div>
      </div>
    </section>
  );
}
