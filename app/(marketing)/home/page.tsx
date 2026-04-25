import Link from 'next/link';
import {
  Package, Users, Wrench, FileText, Shield, BarChart3,
  CheckCircle2, ChevronRight,
} from 'lucide-react';
import { CTABand } from '@/components/marketing/CTABand';
import { DashboardMock } from '@/components/marketing/DashboardMock';

const FEATURES = [
  { icon: Package, title: 'Track', desc: 'Know exactly what you own, where it is, and who has it. QR codes on every asset, scannable from any phone.' },
  { icon: Users, title: 'Manage', desc: 'Assign, retire, and request changes through a structured workflow. Admin approvals built-in — no email threads.' },
  { icon: Wrench, title: 'Maintain', desc: 'Log maintenance history and warranty coverage. Get alerted before warranties lapse, not after.' },
  { icon: FileText, title: 'Comply', desc: 'Every action logged. Export audit trails for SOC 2, ISO 27001, or your internal compliance team.' },
  { icon: Shield, title: 'Control', desc: 'Role-based access keeps the right data in the right hands. Multi-tenant by design.' },
  { icon: BarChart3, title: 'Report', desc: 'Inventory metrics, maintenance costs, warranty health. Charts that tell you what to do next.' },
];

const ROLES = [
  {
    role: 'Admins', tone: { bg: 'var(--primary-100)', color: 'var(--primary-700)' },
    desc: 'Manage the entire inventory. Approve requests, run reports, export audit logs.',
    items: ['Bulk import CSV', 'Approve / reject', 'Export reports', 'Manage roles'],
  },
  {
    role: 'Staff', tone: { bg: 'var(--gray-100)', color: 'var(--gray-600)' },
    desc: 'See assets assigned to them. File requests for new equipment, repairs, or transfers.',
    items: ['Request asset', 'Log repair', 'Update location', 'Submit ticket'],
  },
  {
    role: 'Super-admins', tone: { bg: 'var(--blue-100)', color: 'var(--blue-700)' },
    desc: 'Operate across organizations. Distinct dark theme makes elevated context unmistakable.',
    items: ['Switch tenants', 'Platform metrics', 'Cross-org audit', 'Suspend orgs'],
  },
];

const STATS = [
  { value: '2.1M', label: 'Assets tracked', sub: 'Across 1,284 organizations' },
  { value: '99.99%', label: 'Uptime', sub: 'Q1 2026 — third quarter in a row' },
  { value: '4.2 min', label: 'Average setup time', sub: 'From signup to first asset' },
  { value: '$12M', label: 'Warranty value protected', sub: 'From silent expiration in 2025' },
];

const LOGOS = ['ATLAS', 'NORTHWIND', 'ZENITH ★', 'CIRRUS', 'HELIX', 'PROXIMA'];

const QUOTES = [
  { name: 'Hala Mansour', role: 'Director of Operations', org: 'Atlas Logistics', quote: 'We retired 14 spreadsheets in our first month. The audit trail alone has paid for the platform — our last SOC 2 review took three days instead of three weeks.' },
  { name: 'Daniel Park', role: 'Head of IT', org: 'Northwind Health', quote: 'Warranty alerts surface 30 days out. We\'ve stopped paying for surprise out-of-warranty repairs entirely. The QR code workflow on the floor is genuinely beloved by our techs.' },
  { name: 'Yara El-Ghoul', role: 'Procurement Lead', org: 'Cirrus Manufacturing', quote: 'Multi-tenancy across our 7 plants means each site has autonomy without losing visibility at HQ. The role separation between admin and staff is exactly the level of strict we needed.' },
];

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase();
}

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg,#fff 0%,var(--surface-page) 100%)', paddingTop: 24 }}>
        <div aria-hidden className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(79,70,229,0.08) 1px, transparent 1px)', backgroundSize: '28px 28px', maskImage: 'radial-gradient(at 50% 30%, #000 30%, transparent 70%)', WebkitMaskImage: 'radial-gradient(at 50% 30%, #000 30%, transparent 70%)' }} />
        <div className="relative mx-auto px-8" style={{ maxWidth: 1280, paddingTop: 64, paddingBottom: 0 }}>
          <div className="text-center mx-auto" style={{ maxWidth: 880 }}>
            {/* Pill */}
            <div className="inline-flex items-center gap-2 mb-7 px-3 py-1.5 rounded-full border text-sm" style={{ background: '#fff', borderColor: 'var(--border-default)', color: 'var(--gray-700)', boxShadow: 'var(--shadow-xs)' }}>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--primary-700)' }} /> New
              </span>
              <span>Bulk asset import + CSV templates is here.</span>
              <span className="font-medium" style={{ color: 'var(--primary-600)' }}>Read more →</span>
            </div>

            <h1 style={{ fontSize: 72, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.02, margin: '0 0 24px', color: 'var(--gray-900)' }}>
              Everything your<br />organization owns,<br />
              <span style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--violet-600))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                in one place.
              </span>
            </h1>
            <p style={{ fontSize: 20, lineHeight: 1.5, color: 'var(--gray-600)', margin: '0 auto 36px', maxWidth: 660 }}>
              Makhzoon gives operations and IT teams complete visibility over every asset — from acquisition to retirement, with full audit compliance and zero spreadsheets.
            </p>
            <div className="inline-flex gap-3 mb-3">
              <Link href="/login" className="inline-flex items-center justify-center px-6 h-12 rounded-xl font-semibold text-white no-underline" style={{ background: 'var(--primary-600)', textDecoration: 'none', fontSize: 16 }}>
                Start free trial
              </Link>
              <Link href="/contact" className="inline-flex items-center gap-1.5 px-6 h-12 rounded-xl font-semibold no-underline border" style={{ color: 'var(--gray-700)', borderColor: 'var(--border-default)', textDecoration: 'none', fontSize: 16, background: '#fff' }}>
                Book a demo <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>14-day trial · No credit card · 5-minute setup</p>
          </div>

          {/* Product screenshot */}
          <div className="relative mt-16">
            <div className="absolute" style={{ inset: '-40px -10% 60%', background: 'radial-gradient(closest-side, rgba(79,70,229,0.18), transparent)', filter: 'blur(40px)' }} />
            <div className="relative overflow-hidden" style={{ borderRadius: 'var(--r-lg)', boxShadow: '0 30px 80px -20px rgba(15,23,42,0.25), 0 0 0 1px var(--border-default)' }}>
              {/* Browser chrome */}
              <div style={{ height: 36, background: '#F8FAFC', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px' }}>
                <div style={{ width: 12, height: 12, borderRadius: 999, background: '#FF5F57' }} />
                <div style={{ width: 12, height: 12, borderRadius: 999, background: '#FEBC2E' }} />
                <div style={{ width: 12, height: 12, borderRadius: 999, background: '#28C840' }} />
                <div className="flex-1 text-center" style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--gray-400)' }}>app.makhzoon.me / dashboard</div>
              </div>
              <div style={{ height: 520 }}>
                <DashboardMock />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ background: '#fff', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Capabilities</div>
            <h2 style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 14px', color: 'var(--gray-900)', maxWidth: 640 }}>Five jobs Makhzoon does better than your spreadsheet.</h2>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: 'var(--gray-600)', margin: 0 }}>Each one earns its place. None of it is filler.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ padding: 28, border: '1px solid var(--border-default)', borderRadius: 'var(--r-lg)', background: '#fff' }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <Icon size={20} color="var(--primary-600)" />
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--gray-900)', marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--gray-600)' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles / Workflow */}
      <section style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--border-default)', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 56, maxWidth: 760 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Workflow</div>
            <h2 style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 14px', color: 'var(--gray-900)' }}>One source of truth, three roles.</h2>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: 'var(--gray-600)', margin: 0 }}>From the IT manager filing audit reports to the field tech logging a repair — everyone sees what they need, nothing they don&apos;t.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {ROLES.map(({ role, tone, desc, items }) => (
              <div key={role} style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--r-lg)', padding: 28, boxShadow: 'var(--shadow-xs)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 500, ...tone }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: tone.color }} />{role}
                </span>
                <div style={{ fontSize: 17, fontWeight: 600, marginTop: 14, marginBottom: 8, color: 'var(--gray-900)' }}>What {role.toLowerCase()} do</div>
                <p style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: 18 }}>{desc}</p>
                <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 14 }}>
                  {items.map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13.5, color: 'var(--gray-700)' }}>
                      <CheckCircle2 size={14} color="var(--primary-600)" /> {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats + Logo cloud */}
      <section style={{ background: '#fff', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 56, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 32, alignItems: 'center', opacity: 0.6 }}>
            {LOGOS.map((name, i) => (
              <div key={name} style={{ fontFamily: i % 2 === 0 ? 'monospace' : 'inherit', fontSize: i === 2 ? 16 : 18, fontWeight: i % 2 === 0 ? 500 : 700, letterSpacing: i % 2 === 0 ? '0.12em' : '-0.02em', color: 'var(--gray-500)', textAlign: 'center' }}>{name}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, padding: '40px 0', borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)' }}>
            {STATS.map(({ value, label, sub }) => (
              <div key={label}>
                <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--primary-600)', lineHeight: 1, marginBottom: 8 }}>{value}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-900)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--border-default)', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 56, maxWidth: 760 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>What customers say</div>
            <h2 style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0, color: 'var(--gray-900)' }}>The receipts.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {QUOTES.map(({ name, role, org, quote }) => (
              <div key={name} style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--r-lg)', padding: 32, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ fontSize: 32, color: 'var(--primary-400)', lineHeight: 0, marginBottom: 12, fontFamily: 'serif' }}>&ldquo;</div>
                <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--gray-800)', flex: 1, marginBottom: 24 }}>{quote}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 18, borderTop: '1px solid var(--border-default)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--primary-700)', flexShrink: 0 }}>
                    {initials(name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-900)' }}>{name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{role} · {org}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABand />
    </>
  );
}
