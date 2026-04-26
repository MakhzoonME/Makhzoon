import { CTABand } from '@/components/marketing/CTABand';

function ChevronRightSVG() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <path d="M4.5 3l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CASES = [
  { org: 'Cirrus Manufacturing', industry: 'Manufacturing', desc: 'Multi-tenant for 7 plants. HQ visibility, plant autonomy.', scale: '8,400 assets' },
  { org: 'Zenith Education', industry: 'Education', desc: 'Tracking 2,200 student-issued laptops across 12 campuses.', scale: '2,200 assets' },
  { org: 'Helix Bank', industry: 'Finance', desc: 'Quarterly compliance reports generated from one filter view.', scale: '4,100 assets' },
];

export default function CustomersPage() {
  return (
    <>
      <section style={{ padding: '80px 32px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>Customers</div>
          <h1 style={{ fontSize: 60, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 0 22px', color: 'var(--gray-900)' }}>1,284 organizations. Zero spreadsheets.</h1>
          <p style={{ fontSize: 19, color: 'var(--gray-600)', lineHeight: 1.5, margin: 0 }}>Operations teams in technology, healthcare, finance, manufacturing, education, and government use Makhzoon to keep track of what they own.</p>
        </div>
      </section>

      <section style={{ background: '#fff', padding: '48px 32px 96px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Featured + secondary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Atlas featured */}
            <div style={{ padding: 40, background: 'linear-gradient(135deg, var(--gray-900), #1E1B4B)', color: '#fff', borderRadius: 'var(--r-lg)', minHeight: 380 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, background: 'var(--blue-100)', color: 'var(--blue-700)', fontSize: 12, fontWeight: 500 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--blue-700)' }} /> Featured
              </span>
              <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.3, margin: '20px 0 16px', maxWidth: 540 }}>How Atlas Logistics retired 14 spreadsheets and cut SOC 2 prep from three weeks to three days.</div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 28, maxWidth: 480 }}>2,400 assets across 4 distribution centers, full audit trail, IT and Operations finally on the same page.</p>
              <div style={{ display: 'flex', gap: 28, marginBottom: 28 }}>
                {[['14', 'Spreadsheets retired'], ['92%', 'Faster audit prep'], ['$48K', 'Annual savings']].map(([v, l]) => (
                  <div key={l}><div style={{ fontSize: 28, fontWeight: 700 }}>{v}</div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{l}</div></div>
                ))}
              </div>
              <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                Read case study <ChevronRightSVG />
              </button>
            </div>
            {/* Northwind */}
            <div style={{ padding: 32, border: '1px solid var(--border-default)', borderRadius: 'var(--r-lg)', minHeight: 380, display: 'flex', flexDirection: 'column', background: '#fff' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--gray-500)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Healthcare</div>
              <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.3, marginBottom: 14, color: 'var(--gray-900)' }}>Northwind Health stopped paying for surprise repairs.</div>
              <p style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.6, flex: 1 }}>30-day warranty alerts caught 47 lapsing contracts in the first quarter, saving an estimated $112K in out-of-warranty repair costs.</p>
              <div style={{ paddingTop: 18, borderTop: '1px solid var(--border-default)', marginTop: 18, fontSize: 13, color: 'var(--gray-500)' }}>1,800 assets · 6 facilities</div>
            </div>
          </div>

          {/* 3-col grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {CASES.map(({ org, industry, desc, scale }) => (
              <div key={org} style={{ padding: 28, border: '1px solid var(--border-default)', borderRadius: 'var(--r-lg)', background: '#fff', boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--gray-500)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>{industry}</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--gray-900)' }}>{org}</div>
                <p style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: 18 }}>{desc}</p>
                <div style={{ fontSize: 12, color: 'var(--primary-600)', fontWeight: 500 }}>{scale} →</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABand />
    </>
  );
}
