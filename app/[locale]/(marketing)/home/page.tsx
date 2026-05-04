'use client';
import Link from 'next/link';
import { CTABand } from '@/components/marketing/CTABand';
import { DashboardMock } from '@/components/marketing/DashboardMock';
import { Package, Users, Wrench, FileText, ShieldCheck, BarChart2, CheckCircle2, ChevronRight } from 'lucide-react';

const FEATURES = [
  { Icon: Package, title: 'Track', desc: 'Know exactly what you own, where it is, and who has it. QR codes on every asset, scannable from any phone.' },
  { Icon: Users,  title: 'Manage', desc: 'Assign, retire, and request changes through a structured workflow. Admin approvals built-in — no email threads.' },
  { Icon: Wrench, title: 'Maintain', desc: 'Log maintenance history and warranty coverage. Get alerted before warranties lapse, not after.' },
  { Icon: FileText,   title: 'Comply', desc: 'Every action logged. Export audit trails for SOC 2, ISO 27001, or your internal compliance team.' },
  { Icon: ShieldCheck, title: 'Control', desc: 'Role-based access keeps the right data in the right hands. Multi-tenant by design.' },
  { Icon: BarChart2, title: 'Report', desc: 'Inventory metrics, maintenance costs, warranty health. Charts that tell you what to do next.' },
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
  { value: '2.1M',    label: 'Assets tracked',         sub: 'Across 1,284 organizations' },
  { value: '99.99%',  label: 'Uptime',                  sub: 'Q1 2026 — third quarter in a row' },
  { value: '4.2 min', label: 'Average setup time',      sub: 'From signup to first asset' },
  { value: '$12M',    label: 'Warranty value protected', sub: 'From silent expiration in 2025' },
];

const LOGOS = ['ATLAS', 'NORTHWIND', 'ZENITH ★', 'CIRRUS', 'HELIX', 'PROXIMA'];

const QUOTES = [
  { name: 'Hala Mansour',  role: 'Director of Operations', org: 'Atlas Logistics',       quote: 'We retired 14 spreadsheets in our first month. The audit trail alone has paid for the platform — our last SOC 2 review took three days instead of three weeks.' },
  { name: 'Daniel Park',   role: 'Head of IT',              org: 'Northwind Health',      quote: "Warranty alerts surface 30 days out. We've stopped paying for surprise out-of-warranty repairs entirely. The QR code workflow is genuinely beloved by our techs." },
  { name: 'Yara El-Ghoul', role: 'Procurement Lead',        org: 'Cirrus Manufacturing', quote: "Multi-tenancy across our 7 plants means each site has autonomy without losing visibility at HQ. The role separation between admin and staff is exactly what we needed." },
];

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase();
}

export default function HomePage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg,#fff 0%,var(--surface-page) 100%)', paddingTop: 24 }}>
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(79,70,229,0.07) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(at 50% 30%, #000 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(at 50% 30%, #000 30%, transparent 70%)',
          }}
        />
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

            <h1 style={{ fontSize: 'clamp(44px, 5.8vw, 72px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.03, margin: '0 0 24px', color: 'var(--gray-900)' }}>
              Everything your<br />organization owns,<br />
              <span style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--violet-600))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                in one place.
              </span>
            </h1>
            <p style={{ fontSize: 20, lineHeight: 1.55, color: 'var(--gray-600)', margin: '0 auto 36px', maxWidth: 620 }}>
              Makhzoon gives operations and IT teams complete visibility over every asset — from acquisition to retirement, with full audit compliance and zero spreadsheets.
            </p>
            <div className="inline-flex gap-3 mb-3">
              <Link href="/login" className="inline-flex items-center justify-center gap-2 px-6 h-12 rounded-xl font-semibold text-white no-underline transition-opacity duration-150 hover:opacity-90" style={{ background: 'var(--primary-600)', textDecoration: 'none', fontSize: 16 }}>
                Start free trial
              </Link>
              <Link href="/contact" className="inline-flex items-center gap-1.5 px-6 h-12 rounded-xl font-semibold no-underline border transition-colors duration-150 hover:bg-gray-50" style={{ color: 'var(--gray-700)', borderColor: 'var(--border-default)', textDecoration: 'none', fontSize: 16, background: '#fff' }}>
                Book a demo <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </div>
            <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>14-day trial · No credit card · 5-minute setup</p>
          </div>

          {/* Product screenshot */}
          <div className="relative mt-16">
            <div className="absolute" style={{ inset: '-40px -10% 60%', background: 'radial-gradient(closest-side, rgba(79,70,229,0.16), transparent)', filter: 'blur(40px)' }} />
            <div className="relative overflow-hidden" style={{ borderRadius: 14, boxShadow: '0 32px 80px -20px rgba(15,23,42,0.24), 0 0 0 1px var(--border-default)' }}>
              {/* Browser chrome */}
              <div style={{ height: 36, background: '#F8FAFC', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px' }}>
                <div style={{ width: 11, height: 11, borderRadius: 999, background: '#FF5F57' }} />
                <div style={{ width: 11, height: 11, borderRadius: 999, background: '#FEBC2E' }} />
                <div style={{ width: 11, height: 11, borderRadius: 999, background: '#28C840' }} />
                <div className="flex-1 text-center" style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--gray-400)' }}>app.makhzoon.me / dashboard</div>
              </div>
              <div style={{ height: 520 }}>
                <DashboardMock />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Capabilities</div>
            <h2 style={{ fontSize: 'clamp(28px,3.5vw,40px)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 14px', color: 'var(--gray-900)', maxWidth: 640 }}>
              Five jobs Makhzoon does better than your spreadsheet.
            </h2>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: 'var(--gray-600)', margin: 0 }}>Each one earns its place. None of it is filler.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {FEATURES.map(({ Icon, title, desc }) => (
              <div
                key={title}
                style={{
                  padding: 28,
                  border: '1px solid var(--border-default)',
                  borderRadius: 12,
                  background: '#fff',
                  transition: 'box-shadow 0.18s ease, border-color 0.18s ease, transform 0.18s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px -4px rgba(15,23,42,0.12)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary-200)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-default)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, color: 'var(--primary-600)' }}>
                  <Icon />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-900)', marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--gray-600)' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles / Workflow ──────────────────────────────────────────── */}
      <section style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--border-default)', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 56, maxWidth: 760 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Workflow</div>
            <h2 style={{ fontSize: 'clamp(28px,3.5vw,40px)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 14px', color: 'var(--gray-900)' }}>One source of truth, three roles.</h2>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: 'var(--gray-600)', margin: 0 }}>From the IT manager filing audit reports to the field tech logging a repair — everyone sees what they need, nothing they don&apos;t.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {ROLES.map(({ role, tone, desc, items }) => (
              <div key={role} style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 12, padding: 28, boxShadow: 'var(--shadow-xs)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, fontSize: 12, fontWeight: 500, ...tone }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: tone.color }} />{role}
                </span>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 16, marginBottom: 8, color: 'var(--gray-900)' }}>What {role.toLowerCase()} do</div>
                <p style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.65, marginBottom: 20 }}>{desc}</p>
                <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {items.map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 13.5, color: 'var(--gray-700)' }}>
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-primary-600" strokeWidth={1.75} /> {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats + Logo cloud ─────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          {/* Logo cloud */}
          <div style={{ marginBottom: 56, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 32, alignItems: 'center', opacity: 0.55 }}>
            {LOGOS.map((name, i) => (
              <div key={name} style={{ fontFamily: i % 2 === 0 ? 'monospace' : 'inherit', fontSize: i === 2 ? 15 : 17, fontWeight: i % 2 === 0 ? 500 : 700, letterSpacing: i % 2 === 0 ? '0.1em' : '-0.02em', color: 'var(--gray-500)', textAlign: 'center' }}>{name}</div>
            ))}
          </div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, padding: '40px 0', borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)' }}>
            {STATS.map(({ value, label, sub }) => (
              <div key={label}>
                <div style={{ fontSize: 'clamp(36px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--primary-600)', lineHeight: 1, marginBottom: 8 }}>{value}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-900)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────── */}
      <section style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--border-default)', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 56, maxWidth: 760 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>What customers say</div>
            <h2 style={{ fontSize: 'clamp(28px,3.5vw,40px)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0, color: 'var(--gray-900)' }}>The receipts.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {QUOTES.map(({ name, role, org, quote }) => (
              <div key={name} style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-xs)' }}>
                {/* Quote mark */}
                <svg width="28" height="22" viewBox="0 0 28 22" fill="none" aria-hidden style={{ marginBottom: 14, flexShrink: 0 }}>
                  <path d="M0 22V12.8C0 5.507 3.787 1.28 11.36 0l1.12 2.24C8.693 3.093 6.88 5.347 6.56 8.8H11.2V22H0zm16.8 0V12.8c0-7.293 3.787-11.52 11.36-12.8L29.28 2.24c-3.787.853-5.6 3.107-5.92 6.56H28V22H16.8z" fill="var(--primary-200)" />
                </svg>
                <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--gray-800)', flex: 1, marginBottom: 24 }}>{quote}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 18, borderTop: '1px solid var(--border-default)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'var(--primary-700)', flexShrink: 0 }}>
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
