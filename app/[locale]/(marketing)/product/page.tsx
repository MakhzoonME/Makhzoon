import { CTABand } from '@/components/marketing/CTABand';
import { AssetsPreview, WarrantiesPreview, RequestsPreview, AuditLogPreview } from '@/components/marketing/FeaturePreview';
import { CheckCircle2 } from 'lucide-react';

const PILLARS = [
  {
    kicker: 'أصول · Usool',
    kickerColor: '#00695C',
    title: 'A complete record for every asset you own.',
    body: 'Each asset gets a structured record — category, serial, assignee, location, cost, purchase date, custom notes — plus a scannable QR code. Bulk import via CSV; field validation surfaces errors per row before anything saves.',
    bullets: ['Structured fields + custom notes', 'Auto-generated QR codes', 'CSV import with row-level validation', 'Document and photo attachments'],
    Preview: AssetsPreview,
    flip: false,
  },
  {
    kicker: 'أصول · Usool — Warranties',
    kickerColor: '#00695C',
    title: 'Stop paying for repairs you were already covered for.',
    body: 'Track every warranty alongside its asset. Progressive alerts at 30, 14, and 7 days before expiration. Vendors, contract terms, claim history — all in one place.',
    bullets: ['Progressive expiry alerts', 'Vendor + claim history', 'Coverage gap visualization', 'Bulk warranty entry'],
    Preview: WarrantiesPreview,
    flip: true,
  },
  {
    kicker: 'رصيد · Raseed',
    kickerColor: '#E65100',
    title: 'Your inventory, clear in real time.',
    body: 'Staff submit requests; admins approve, deny, or route them. Every decision is logged. No more Slack threads about whether the item was restocked.',
    bullets: ['Approval workflow with comments', 'Reorder point alerts', 'Email + in-app notifications', 'Audit trail per request'],
    Preview: RequestsPreview,
    flip: false,
  },
  {
    kicker: 'Audit logs',
    kickerColor: undefined,
    title: "Compliance isn't a quarterly scramble anymore.",
    body: 'Every create, update, delete, and assignment is logged with actor, timestamp, and before/after diff. Export filtered logs for any date range in one click.',
    bullets: ['Tamper-evident append-only log', 'Before/after field diff', 'Filterable by user, action, date', 'Export as CSV or JSON'],
    Preview: AuditLogPreview,
    flip: true,
  },
];

const INTEGRATIONS = [
  { name: 'Google Workspace', icon: 'G' },
  { name: 'Microsoft 365',    icon: 'M' },
  { name: 'Slack',            icon: 'S' },
  { name: 'Jira',             icon: 'J' },
  { name: 'Zapier',           icon: 'Z' },
  { name: 'REST API',         icon: '⬡' },
  { name: 'Webhooks',         icon: '⚡' },
  { name: 'CSV / Excel',      icon: '⬡' },
];

export default function ProductPage() {
  return (
    <>
      {/* Hero */}
      <section className="px-4 sm:px-8 pt-16 sm:pt-24 pb-10 sm:pb-12 text-center" style={{ background: 'linear-gradient(180deg, #fff 0%, var(--surface-page) 100%)' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(79,70,229,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px', maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, #000 40%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, #000 40%, transparent 80%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>Product · Overview</div>
          <h1 style={{ fontSize: 'clamp(40px,5.5vw,60px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.06, margin: '0 0 22px', color: 'var(--gray-900)' }}>
            نظام تشغيل<br />للمؤسسات العربية.
          </h1>
          <p style={{ fontSize: 19, color: 'var(--gray-600)', lineHeight: 1.55, margin: 0, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
            أصول، رصيد، حركة، مال، بنّا — five modules built for growing Arab organizations. One platform, zero spreadsheets.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="px-4 sm:px-8 pt-8 pb-16 md:pb-24" style={{ background: '#fff', position: 'relative' }}>
        <div className="max-w-[1100px] mx-auto flex flex-col gap-16 md:gap-24">
          {PILLARS.map(({ kicker, kickerColor, title, body, bullets, Preview, flip }) => (
            <div
              key={kicker}
              className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center"
            >
              {/* Text side — always LTR; use order to flip layout */}
              <div style={{ order: flip ? 2 : 1 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: kickerColor ?? 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>{kicker}</div>
                <h2 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.22, letterSpacing: '-0.02em', margin: '0 0 16px', color: 'var(--gray-900)' }}>{title}</h2>
                <p style={{ fontSize: 15.5, color: 'var(--gray-600)', lineHeight: 1.65, marginBottom: 24, margin: '0 0 24px' }}>{body}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {bullets.map(b => (
                    <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--gray-700)' }}>
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-primary-600" strokeWidth={1.75} />{b}
                    </div>
                  ))}
                </div>
              </div>

              {/* Illustration side */}
              <div
                style={{
                  order: flip ? 1 : 2,
                  background: 'linear-gradient(135deg, var(--primary-50) 0%, var(--gray-50) 60%, #fff 100%)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 16,
                  padding: '32px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 280,
                }}
              >
                <div style={{ width: '100%', maxWidth: 400 }}>
                  <Preview />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section className="px-4 sm:px-8 py-16 md:py-24" style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--border-default)' }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="mb-10 md:mb-12 max-w-[640px]">
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Integrations</div>
            <h2 style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', margin: '0 0 14px', color: 'var(--gray-900)' }}>Fits where your team already works.</h2>
            <p style={{ fontSize: 17, color: 'var(--gray-600)', lineHeight: 1.55, margin: 0 }}>Native integrations and a REST API mean Makhzoon connects to your existing stack without an IT project.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {INTEGRATIONS.map(({ name, icon }) => (
              <div
                key={name}
                style={{
                  background: '#fff',
                  border: '1px solid var(--border-default)',
                  borderRadius: 10,
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--primary-700)', flexShrink: 0 }}>
                  {icon}
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--gray-800)' }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABand />
    </>
  );
}
