import { CheckCircle2 } from 'lucide-react';
import { CTABand } from '@/components/marketing/CTABand';

const PILLARS = [
  {
    kicker: 'Assets',
    title: 'A complete record for every asset you own.',
    body: 'Each asset gets a structured record — category, serial, assignee, location, cost, purchase date, custom notes — plus a scannable QR code printed in seconds. Bulk import via CSV; field validation surfaces errors per row before anything saves.',
    bullets: ['Structured fields + custom notes', 'Auto-generated QR codes', 'CSV import with row-level validation', 'Photo + document attachments'],
    flip: false,
  },
  {
    kicker: 'Warranties',
    title: 'Stop paying for repairs you were already covered for.',
    body: 'Track every warranty alongside its asset. Get progressive alerts at 30, 14, and 7 days before expiration. Vendors, contract terms, claim history — all in one place.',
    bullets: ['Progressive expiry alerts', 'Vendor + claim history', 'Coverage gap visualization', 'Bulk warranty entry'],
    flip: true,
  },
  {
    kicker: 'Requests',
    title: 'Structured intake for every asset request.',
    body: 'Staff submit requests; admins approve, deny, or route them. Every decision is logged. No more Slack threads about whether the laptop requisition was approved.',
    bullets: ['Approval workflow with comments', 'Request templates', 'Email + in-app notifications', 'Audit trail per request'],
    flip: false,
  },
  {
    kicker: 'Audit logs',
    title: "Compliance isn't a quarterly scramble anymore.",
    body: 'Every create, update, delete, and assignment is logged with actor, timestamp, and before/after diff. Export filtered logs for any date range in one click.',
    bullets: ['Tamper-evident append-only log', 'Before/after field diff', 'Filterable by user, action, date', 'Export as CSV or JSON'],
    flip: true,
  },
];

const INTEGRATIONS = ['Google Workspace', 'Microsoft 365', 'Slack', 'Jira', 'Zapier', 'REST API', 'Webhooks', 'CSV / Excel'];

export default function ProductPage() {
  return (
    <>
      {/* Hero */}
      <section style={{ padding: '80px 32px 40px', textAlign: 'center', background: 'linear-gradient(180deg, #fff, var(--surface-page))' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>Product · Overview</div>
          <h1 style={{ fontSize: 60, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 0 22px', color: 'var(--gray-900)' }}>Built for the entire asset lifecycle.</h1>
          <p style={{ fontSize: 19, color: 'var(--gray-600)', lineHeight: 1.5, margin: 0 }}>Acquire, assign, maintain, audit, retire. Five stages, one platform, zero handoffs to spreadsheets.</p>
        </div>
      </section>

      {/* Pillars */}
      <section style={{ background: '#fff', padding: '48px 32px 96px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 80 }}>
          {PILLARS.map(({ kicker, title, body, bullets, flip }) => (
            <div key={kicker} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', direction: flip ? 'rtl' : 'ltr' }}>
              <div style={{ direction: 'ltr' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>{kicker}</div>
                <h2 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', margin: '0 0 16px', color: 'var(--gray-900)' }}>{title}</h2>
                <p style={{ fontSize: 16, color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: 24 }}>{body}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {bullets.map(b => (
                    <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--gray-700)' }}>
                      <CheckCircle2 size={16} color="var(--primary-600)" style={{ flexShrink: 0 }} />{b}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ direction: 'ltr', background: 'linear-gradient(135deg, var(--primary-50), #fff)', border: '1px solid var(--border-default)', borderRadius: 'var(--r-lg)', padding: 40, minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--gray-400)' }}>{kicker} preview</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--border-default)', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 48, maxWidth: 640 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Integrations</div>
            <h2 style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', margin: '0 0 14px', color: 'var(--gray-900)' }}>Fits where your team already works.</h2>
            <p style={{ fontSize: 17, color: 'var(--gray-600)', lineHeight: 1.55, margin: 0 }}>Native integrations and a REST API mean Makhzoon connects to your existing stack without an IT project.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {INTEGRATIONS.map(name => (
              <div key={name} style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--r-md)', padding: '18px 20px', fontSize: 14, fontWeight: 500, color: 'var(--gray-800)' }}>{name}</div>
            ))}
          </div>
        </div>
      </section>

      <CTABand />
    </>
  );
}
