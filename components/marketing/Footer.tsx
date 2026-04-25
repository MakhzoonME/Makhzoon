import Link from 'next/link';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';

const COLS = [
  {
    title: 'Product',
    links: [['Overview', '/product'], ['Pricing', '/pricing'], ['Security', '/security'], ['Changelog', '#'], ['Roadmap', '#']],
  },
  {
    title: 'Company',
    links: [['About', '/about'], ['Customers', '/customers'], ['Careers', '#'], ['Press', '#'], ['Contact', '/contact']],
  },
  {
    title: 'Resources',
    links: [['Documentation', '#'], ['API reference', '#'], ['Help center', '#'], ['Status', '#'], ['Blog', '#']],
  },
  {
    title: 'Legal',
    links: [['Privacy', '#'], ['Terms', '#'], ['DPA', '#'], ['Cookies', '#'], ['Subprocessors', '#']],
  },
];

export function MarketingFooter() {
  return (
    <footer style={{ background: 'var(--gray-900)', color: 'rgba(255,255,255,0.75)', padding: '64px 32px 32px', marginTop: 80 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <MakhzoonMark size={28} fill="#FFFFFF" glyphFill="var(--gray-900)" />
              <span style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>Makhzoon</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 320, margin: '0 0 20px', color: 'rgba(255,255,255,0.65)' }}>
              Asset intelligence for growing organizations. Track, manage, and stay audit-ready — without spreadsheets.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, background: 'var(--green-100)', color: 'var(--green-700)', fontSize: 12, fontWeight: 500 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--green-700)' }} /> SOC 2 Type II
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, background: 'var(--blue-100)', color: 'var(--blue-700)', fontSize: 12, fontWeight: 500 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--blue-700)' }} /> ISO 27001
              </span>
            </div>
          </div>

          {COLS.map(({ title, links }) => (
            <div key={title}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>{title}</div>
              {links.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  style={{ display: 'block', fontSize: 13.5, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', padding: '5px 0' }}
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div style={{ paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>© 2026 Makhzoon, Inc. مخزون · &ldquo;stored&rdquo;</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-geist-mono, monospace)' }}>Built in Amman · Trusted globally</div>
        </div>
      </div>
    </footer>
  );
}
