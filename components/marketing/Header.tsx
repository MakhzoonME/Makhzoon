'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';

function HamburgerSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="1" y="3.5" width="16" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="1" y="8.25" width="16" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="1" y="13" width="16" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );
}
function CloseSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.makhzoon.me';

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';

  const NAV = [
    { label: 'Product',   href: `/${locale}/product`   },
    { label: 'Customers', href: `/${locale}/customers` },
    { label: 'Pricing',   href: `/${locale}/pricing`   },
    { label: 'Security',  href: `/${locale}/security`  },
    { label: 'About',     href: `/${locale}/about`     },
  ];

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const showBg = scrolled || mobileOpen;

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-200"
      style={{
        background:           showBg ? 'rgba(255,255,255,0.92)' : 'transparent',
        backdropFilter:       showBg ? 'saturate(180%) blur(16px)' : 'none',
        WebkitBackdropFilter: showBg ? 'saturate(180%) blur(16px)' : 'none',
        borderBottom:         scrolled ? '1px solid var(--border-default)' : '1px solid transparent',
      }}
    >
      <div className="mx-auto flex items-center px-4 sm:px-8 h-[68px]" style={{ maxWidth: 1280 }}>
        {/* Brand */}
        <Link
          href={`/${locale}/home`}
          className="inline-flex items-center gap-2.5 me-4 md:me-8 no-underline group flex-shrink-0"
          style={{ textDecoration: 'none' }}
        >
          <MakhzoonMark size={28} />
          <span
            className="font-semibold text-gray-900 transition-opacity duration-150 group-hover:opacity-80"
            style={{ fontSize: 15.5, letterSpacing: '0.01em' }}
          >
            Makhzoon
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-0.5 flex-1">
          {NAV.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="px-3 py-2 rounded-lg text-sm font-medium no-underline transition-all duration-150"
                style={{
                  color:      active ? 'var(--gray-900)' : 'var(--gray-600)',
                  background: active ? 'var(--gray-100)' : 'transparent',
                  fontWeight: active ? 600 : 500,
                  textDecoration: 'none',
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--gray-50)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--gray-900)'; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--gray-600)'; } }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-2.5 flex-shrink-0">
          <a
            href={`${APP_URL}/${locale}/login`}
            className="text-sm font-medium no-underline transition-colors duration-150"
            style={{ color: 'var(--gray-700)', textDecoration: 'none' }}
          >
            Sign in
          </a>
          <a
            href={`${APP_URL}/${locale}/login`}
            className="inline-flex items-center justify-center px-4 h-9 rounded-lg text-sm font-semibold text-white no-underline transition-opacity duration-150 hover:opacity-90"
            style={{ background: 'var(--primary-600)', textDecoration: 'none' }}
          >
            Start free trial
          </a>
        </div>

        {/* Mobile: Sign in + hamburger */}
        <div className="flex md:hidden items-center gap-2 ms-auto">
          <a
            href={`${APP_URL}/${locale}/login`}
            className="inline-flex items-center justify-center px-3 h-8 rounded-lg text-xs font-semibold text-white no-underline flex-shrink-0"
            style={{ background: 'var(--primary-600)', textDecoration: 'none' }}
          >
            Sign in
          </a>
          <button
            type="button"
            onClick={() => setMobileOpen(v => !v)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700/60"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <CloseSVG /> : <HamburgerSVG />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t" style={{ borderColor: 'var(--border-default)', background: 'rgba(255,255,255,0.95)' }}>
          <nav className="px-4 py-3 flex flex-col gap-0.5">
            {NAV.map(({ label, href }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center px-3 py-2.5 rounded-lg text-sm no-underline transition-colors"
                  style={{
                    color:      active ? 'var(--gray-900)' : 'var(--gray-600)',
                    background: active ? 'var(--gray-100)' : 'transparent',
                    fontWeight: active ? 600 : 500,
                    textDecoration: 'none',
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
