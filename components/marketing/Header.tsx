'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';

const NAV = [
  { label: 'Product', href: '/product' },
  { label: 'Customers', href: '/customers' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Security', href: '/security' },
  { label: 'About', href: '/about' },
];

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-250"
      style={{
        background: scrolled ? 'rgba(255,255,255,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'saturate(180%) blur(14px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'saturate(180%) blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border-default)' : '1px solid transparent',
      }}
    >
      <div className="mx-auto flex items-center gap-2 px-8 h-[68px]" style={{ maxWidth: 1280 }}>
        <Link href="/home" className="inline-flex items-center gap-2.5 mr-8 no-underline" style={{ textDecoration: 'none' }}>
          <MakhzoonMark size={30} />
          <span className="font-semibold text-gray-900" style={{ fontSize: 16, letterSpacing: '0.01em' }}>Makhzoon</span>
        </Link>

        <nav className="flex gap-1 flex-1">
          {NAV.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="px-3 py-2 rounded-lg text-sm font-medium no-underline transition-colors duration-150"
                style={{
                  color: active ? 'var(--gray-900)' : 'var(--gray-600)',
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

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium no-underline"
            style={{ color: 'var(--gray-700)', textDecoration: 'none' }}
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 h-9 rounded-lg text-sm font-medium text-white no-underline transition-colors duration-150"
            style={{ background: 'var(--primary-600)', textDecoration: 'none' }}
          >
            Start free trial
          </Link>
        </div>
      </div>
    </header>
  );
}
