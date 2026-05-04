'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';

function ShieldBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500, border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="10" height="11" viewBox="0 0 10 11" fill="none" aria-hidden>
        <path d="M5 1L1.5 2.5v3.25C1.5 7.9 3.1 9.4 5 10c1.9-.6 3.5-2.1 3.5-4.25V2.5L5 1z" fill={color} />
      </svg>
      {label}
    </span>
  );
}

export function MarketingFooter() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';

  const COLS = [
    { title: 'Product',   links: [['Overview', `/${locale}/product`], ['Pricing', `/${locale}/pricing`], ['Security', `/${locale}/security`], ['Changelog', '#'], ['Roadmap', '#']] },
    { title: 'Company',   links: [['About', `/${locale}/about`], ['Customers', `/${locale}/customers`], ['Careers', '#'], ['Press', '#'], ['Contact', `/${locale}/contact`]] },
    { title: 'Resources', links: [['Documentation', '#'], ['API reference', '#'], ['Help center', '#'], ['Status', '#'], ['Blog', '#']] },
    { title: 'Legal',     links: [['Privacy', '#'], ['Terms', '#'], ['DPA', '#'], ['Cookies', '#'], ['Subprocessors', '#']] },
  ];

  return (
    <footer
      style={{
        background: 'var(--gray-900)',
        color: 'rgba(255,255,255,0.7)',
        padding: '64px 32px 36px',
        marginTop: 0,
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr', gap: 48, marginBottom: 52 }}>
          {/* Brand col */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <MakhzoonMark size={26} fill="#FFFFFF" glyphFill="var(--gray-900)" />
              <span style={{ fontWeight: 600, fontSize: 15.5, color: '#fff' }}>Makhzoon</span>
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.65, maxWidth: 300, margin: '0 0 18px', color: 'rgba(255,255,255,0.6)' }}>
              Asset intelligence for growing organizations. Track, manage, and stay audit-ready — without spreadsheets.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <ShieldBadge label="SOC 2 Type II" color="#34d399" />
              <ShieldBadge label="ISO 27001"     color="#60a5fa" />
            </div>
          </div>

          {/* Link cols */}
          {COLS.map(({ title, links }) => (
            <div key={title}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 14 }}>{title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {links.map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    style={{ display: 'block', fontSize: 13.5, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', padding: '4px 0', transition: 'color 0.15s ease' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.95)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)' }}>
            © 2026 Makhzoon, Inc. · مخزون · &ldquo;stored&rdquo;
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', fontFamily: 'system-ui, monospace' }}>
            Built in Amman · Trusted globally
          </div>
        </div>
      </div>
    </footer>
  );
}
