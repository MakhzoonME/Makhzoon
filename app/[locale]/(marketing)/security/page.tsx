import { CTABand } from '@/components/marketing/CTABand';
import { ShieldCheck, User, FileText, Layers, RefreshCw, Activity, Eye, Inbox, ChevronRight } from 'lucide-react';

const PILLARS = [
  { Icon: ShieldCheck, title: 'Encryption everywhere',       desc: 'AES-256 at rest, TLS 1.3 in transit. Per-tenant encryption keys with rotation on demand.' },
  { Icon: User,   title: 'Least-privilege by default',  desc: 'Role-based access for every action. Granular custom roles on Enterprise.' },
  { Icon: FileText,   title: 'Tamper-evident audit log',    desc: 'Every action logged with actor, timestamp, before/after diff. Append-only — exports are signed.' },
  { Icon: Layers, title: 'Multi-tenant isolation',      desc: 'Each tenant runs in a logically isolated schema. No cross-tenant query is possible by construction.' },
  { Icon: RefreshCw, title: 'Backup + DR',                desc: 'Hourly snapshots. Cross-region replication. Tested DR with 4-hour RTO and 15-minute RPO.' },
  { Icon: Activity, title: 'Continuous monitoring',     desc: '24/7 SIEM coverage. Quarterly penetration tests. Bug bounty program with HackerOne.' },
];

const TRUST = [
  { Icon: FileText,     title: 'SOC 2 Type II report',     desc: 'Available under NDA. Email security@makhzoon.com.',   cta: 'Request' },
  { Icon: ShieldCheck,   title: 'ISO 27001 certificate',    desc: 'Annually renewed. PDF available without NDA.',        cta: 'Download' },
  { Icon: Eye,      title: 'Privacy policy + DPA',     desc: 'GDPR-aligned. EU data stays in EU regions.',          cta: 'Read' },
  { Icon: Activity, title: 'Status page',              desc: 'Real-time uptime, incident history, scheduled maintenance.', cta: 'Visit' },
  { Icon: Inbox,    title: 'Security disclosure',      desc: 'Found something? security@makhzoon.com — PGP optional.', cta: 'Contact' },
  { Icon: Layers,   title: 'Subprocessors list',       desc: 'Every third-party we share data with, in plain language.', cta: 'Read' },
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
                  {cta} <ChevronRight className="h-3 w-3" strokeWidth={1.75} />
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
