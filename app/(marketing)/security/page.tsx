import { Shield, User, FileText, Layers, RefreshCw, Activity, Eye, Inbox, ChevronRight } from 'lucide-react';
import { CTABand } from '@/components/marketing/CTABand';

const PILLARS = [
  { icon: Shield, title: 'Encryption everywhere', desc: 'AES-256 at rest, TLS 1.3 in transit. Per-tenant encryption keys with rotation on demand.' },
  { icon: User, title: 'Least-privilege by default', desc: 'Role-based access for every action. SCIM provisioning. SAML SSO. Granular custom roles on Enterprise.' },
  { icon: FileText, title: 'Tamper-evident audit log', desc: 'Every action logged with actor, timestamp, before/after diff. Append-only — exports are signed.' },
  { icon: Layers, title: 'Multi-tenant isolation', desc: 'Each tenant runs in a logically isolated database schema. No cross-tenant query is possible by construction.' },
  { icon: RefreshCw, title: 'Backup + DR', desc: 'Hourly snapshots. Cross-region replication. Tested disaster recovery with 4-hour RTO and 15-minute RPO.' },
  { icon: Activity, title: 'Continuous monitoring', desc: '24/7 SIEM coverage. Quarterly penetration tests. Bug bounty program with HackerOne.' },
];

const TRUST = [
  { icon: FileText, title: 'SOC 2 Type II report', desc: 'Available under NDA. Email security@makhzoon.com.', cta: 'Request' },
  { icon: Shield, title: 'ISO 27001 certificate', desc: 'Annually renewed. PDF available without NDA.', cta: 'Download' },
  { icon: Eye, title: 'Privacy policy + DPA', desc: 'GDPR-aligned. EU data stays in EU regions.', cta: 'Read' },
  { icon: Activity, title: 'Status page', desc: 'Real-time uptime, incident history, scheduled maintenance.', cta: 'Visit' },
  { icon: Inbox, title: 'Security disclosure', desc: 'Found something? security@makhzoon.com — PGP optional.', cta: 'Contact' },
  { icon: Layers, title: 'Subprocessors list', desc: 'Every third-party we share data with, listed in plain language.', cta: 'Read' },
];

export default function SecurityPage() {
  return (
    <>
      <section style={{ padding: '80px 32px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>Security & Trust</div>
          <h1 style={{ fontSize: 60, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 0 22px', color: 'var(--gray-900)' }}>Built for the audit you already passed.</h1>
          <p style={{ fontSize: 19, color: 'var(--gray-600)', lineHeight: 1.5, margin: '0 0 28px' }}>Independent certifications, encryption end-to-end, and a security posture documented in plain language.</p>
          <div style={{ display: 'inline-flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[['SOC 2 Type II', 'green'], ['ISO 27001', 'blue'], ['GDPR', 'blue'], ['HIPAA-ready', 'blue']].map(([label, tone]) => (
              <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 999, background: tone === 'green' ? 'var(--green-100)' : 'var(--blue-100)', color: tone === 'green' ? 'var(--green-700)' : 'var(--blue-700)', fontSize: 13, fontWeight: 500 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: tone === 'green' ? 'var(--green-700)' : 'var(--blue-700)' }} />{label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: '#fff', padding: '48px 32px 96px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {PILLARS.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ padding: 28, border: '1px solid var(--border-default)', borderRadius: 'var(--r-lg)', background: '#fff', boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon size={20} color="var(--primary-600)" />
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, color: 'var(--gray-900)' }}>{title}</div>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--gray-600)', margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--border-default)', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 48, maxWidth: 640 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Trust resources</div>
            <h2 style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', margin: 0, color: 'var(--gray-900)' }}>Read the receipts, not the marketing.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {TRUST.map(({ icon: Icon, title, desc, cta }) => (
              <div key={title} style={{ padding: 22, background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 18, boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} color="var(--primary-600)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2, color: 'var(--gray-900)' }}>{title}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{desc}</div>
                </div>
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-default)', background: '#fff', fontSize: 13, fontWeight: 500, color: 'var(--gray-700)', cursor: 'pointer', flexShrink: 0 }}>
                  {cta} <ChevronRight size={12} />
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
