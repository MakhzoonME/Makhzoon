import { CTABand } from '@/components/marketing/CTABand';

/* ── Inline SVG icons ──────────────────────────────────────────── */
function ShieldSVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 2L3 4.5v6C3 14 6.2 17 10 18c3.8-1 7-4 7-7.5v-6L10 2z" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M7 10l2.5 2.5 4-4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UserSVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 18c0-3.866 3.134-6 7-6s7 2.134 7 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function FileSVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M5 2h8l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M13 2v4h4M7 11h6M7 14h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function LayersSVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M2 13l8 4 8-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 9l8 4 8-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 5l8-3 8 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function RefreshSVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 10a6 6 0 0 1 10.5-4M16 4v4h-4M16 10a6 6 0 0 1-10.5 4M4 16v-4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ActivitySVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M2 10h3l2.5-6 4 12 2.5-7L16 10h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function EyeSVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function InboxSVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2" y="3" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M2 11h4l2 3h4l2-3h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronRightSVG() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M4 2.5l3.5 3.5L4 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PILLARS = [
  { Icon: ShieldSVG, title: 'Encryption everywhere',       desc: 'AES-256 at rest, TLS 1.3 in transit. Per-tenant encryption keys with rotation on demand.' },
  { Icon: UserSVG,   title: 'Least-privilege by default',  desc: 'Role-based access for every action. SCIM provisioning. SAML SSO. Granular custom roles on Enterprise.' },
  { Icon: FileSVG,   title: 'Tamper-evident audit log',    desc: 'Every action logged with actor, timestamp, before/after diff. Append-only — exports are signed.' },
  { Icon: LayersSVG, title: 'Multi-tenant isolation',      desc: 'Each tenant runs in a logically isolated schema. No cross-tenant query is possible by construction.' },
  { Icon: RefreshSVG, title: 'Backup + DR',                desc: 'Hourly snapshots. Cross-region replication. Tested DR with 4-hour RTO and 15-minute RPO.' },
  { Icon: ActivitySVG, title: 'Continuous monitoring',     desc: '24/7 SIEM coverage. Quarterly penetration tests. Bug bounty program with HackerOne.' },
];

const TRUST = [
  { Icon: FileSVG,     title: 'SOC 2 Type II report',     desc: 'Available under NDA. Email security@makhzoon.com.',   cta: 'Request' },
  { Icon: ShieldSVG,   title: 'ISO 27001 certificate',    desc: 'Annually renewed. PDF available without NDA.',        cta: 'Download' },
  { Icon: EyeSVG,      title: 'Privacy policy + DPA',     desc: 'GDPR-aligned. EU data stays in EU regions.',          cta: 'Read' },
  { Icon: ActivitySVG, title: 'Status page',              desc: 'Real-time uptime, incident history, scheduled maintenance.', cta: 'Visit' },
  { Icon: InboxSVG,    title: 'Security disclosure',      desc: 'Found something? security@makhzoon.com — PGP optional.', cta: 'Contact' },
  { Icon: LayersSVG,   title: 'Subprocessors list',       desc: 'Every third-party we share data with, in plain language.', cta: 'Read' },
];

export default function SecurityPage() {
  return (
    <>
      <section style={{ padding: '88px 32px 32px', textAlign: 'center', background: 'linear-gradient(180deg, #fff 0%, var(--surface-page) 100%)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>Security & Trust</div>
          <h1 style={{ fontSize: 'clamp(38px,5vw,60px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.06, margin: '0 0 22px', color: 'var(--gray-900)' }}>
            Built for the audit<br />you already passed.
          </h1>
          <p style={{ fontSize: 18, color: 'var(--gray-600)', lineHeight: 1.55, margin: '0 0 28px', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
            Independent certifications, end-to-end encryption, and a security posture documented in plain language.
          </p>
          <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[['SOC 2 Type II', 'green'], ['ISO 27001', 'blue'], ['GDPR', 'blue'], ['HIPAA-ready', 'blue']].map(([label, tone]) => (
              <span
                key={label}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 999,
                  background: tone === 'green' ? 'var(--green-100)' : 'var(--blue-100)',
                  color:      tone === 'green' ? 'var(--green-700)' : 'var(--blue-700)',
                  fontSize: 13, fontWeight: 500,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 999, background: tone === 'green' ? 'var(--green-700)' : 'var(--blue-700)' }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Security pillars */}
      <section style={{ background: '#fff', padding: '48px 32px 96px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {PILLARS.map(({ Icon, title, desc }) => (
              <div key={title} style={{ padding: 28, border: '1px solid var(--border-default)', borderRadius: 12, background: '#fff', boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: 'var(--primary-600)' }}>
                  <Icon />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--gray-900)' }}>{title}</div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--gray-600)', margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust resources */}
      <section style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--border-default)', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 48, maxWidth: 640 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Trust resources</div>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,36px)', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', margin: 0, color: 'var(--gray-900)' }}>Read the receipts, not the marketing.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {TRUST.map(({ Icon, title, desc, cta }) => (
              <div key={title} style={{ padding: 22, background: '#fff', border: '1px solid var(--border-default)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 18, boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--primary-600)' }}>
                  <Icon />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 2, color: 'var(--gray-900)' }}>{title}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)', lineHeight: 1.5 }}>{desc}</div>
                </div>
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-default)', background: '#fff', fontSize: 13, fontWeight: 500, color: 'var(--gray-700)', cursor: 'pointer', flexShrink: 0 }}>
                  {cta} <ChevronRightSVG />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABand />
    </>
  );
}
