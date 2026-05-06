'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CTABand } from '@/components/marketing/CTABand';

function CheckSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="7.5" cy="7.5" r="7.5" fill="var(--primary-100)" />
      <path d="M4.5 7.5l2 2 4-4.5" stroke="var(--primary-600)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CheckSVGFeatured() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="7.5" cy="7.5" r="7.5" fill="rgba(255,255,255,0.2)" />
      <path d="M4.5 7.5l2 2 4-4.5" stroke="var(--primary-600)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PlusSVG() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function MinusSVG() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const TIERS = [
  {
    name: 'Starter',
    monthlyPrice: 59,
    annualPrice: 49,
    sub: 'For small teams getting organized.',
    cap: 'Up to 250 assets · Unlimited users',
    features: ['QR codes & CSV import', 'Warranty tracking', 'Basic reports', 'Email support', '14-day audit log retention'],
    featured: false,
    cta: 'Start free trial',
  },
  {
    name: 'Business',
    monthlyPrice: 179,
    annualPrice: 149,
    sub: 'For growing operations teams.',
    cap: 'Up to 2,500 assets · Unlimited users',
    features: ['Everything in Starter', 'Approval workflows + requests', 'Maintenance records', 'Audit logs (1 year)', 'SSO (Google, Microsoft)', 'API access + webhooks'],
    featured: true,
    cta: 'Start free trial',
  },
  {
    name: 'Enterprise',
    monthlyPrice: null,
    annualPrice: null,
    sub: 'For organizations with compliance needs.',
    cap: 'Unlimited assets · Multi-tenant',
    features: ['Everything in Business', 'SAML SSO + SCIM', 'Audit logs (forever)', 'Custom roles & permissions', 'SLA + dedicated CSM', 'On-prem deployment option'],
    featured: false,
    cta: 'Contact sales',
  },
];

const FAQ = [
  { q: 'What counts as an "asset"?',       a: "Any record you create — a laptop, a license, a vehicle, a piece of equipment. Retired assets keep their history but don't count toward your limit." },
  { q: 'Are users charged separately?',     a: 'No. Invite your whole organization. Pricing is on assets only.' },
  { q: 'Can we exceed our asset cap?',      a: "You'll get a notification at 80% and a soft warning at 100%. We never auto-charge or block you — pick the next tier when ready." },
  { q: 'Do you offer non-profit pricing?',  a: 'Yes. 501(c)(3) and registered non-profits get 40% off any plan. Email sales@makhzoon.com with your registration.' },
  { q: 'How does the 14-day trial work?',   a: "Full Business-tier access. No credit card. After 14 days, you keep your data — pick a plan, downgrade to Starter, or export and walk away." },
  { q: 'Can we self-host?',                 a: 'Enterprise customers can run Makhzoon on-premise or in a private VPC with the same managed-update cadence.' },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 10, overflow: 'hidden', marginBottom: 10, transition: 'box-shadow 0.15s ease' }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12 }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--gray-900)', lineHeight: 1.4 }}>{q}</span>
        <span style={{ color: 'var(--gray-400)', flexShrink: 0 }}>{open ? <MinusSVG /> : <PlusSVG />}</span>
      </button>
      {open && (
        <div style={{ padding: '0 20px 16px', fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.65, borderTop: '1px solid var(--border-default)', paddingTop: 14 }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <>
      {/* Hero */}
      <section style={{ padding: '88px 32px 32px', textAlign: 'center', background: 'linear-gradient(180deg, #fff 0%, var(--surface-page) 100%)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>Pricing</div>
          <h1 style={{ fontSize: 'clamp(38px,5vw,60px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.06, margin: '0 0 22px', color: 'var(--gray-900)' }}>
            Simple, predictable,<br />no per-seat traps.
          </h1>
          <p style={{ fontSize: 19, color: 'var(--gray-600)', lineHeight: 1.55, margin: 0 }}>Pricing scales with assets, not users. Invite your whole org from day one.</p>
        </div>
      </section>

      {/* Tiers */}
      <section style={{ background: '#fff', padding: '48px 32px 96px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', padding: 4, background: 'var(--gray-100)', borderRadius: 999 }}>
              <button
                onClick={() => setAnnual(true)}
                style={{ padding: '8px 20px', borderRadius: 999, border: 'none', background: annual ? '#fff' : 'transparent', boxShadow: annual ? 'var(--shadow-xs)' : 'none', fontWeight: annual ? 600 : 500, fontSize: 13, cursor: 'pointer', color: annual ? 'var(--gray-900)' : 'var(--gray-600)', transition: 'all 0.15s ease' }}
              >
                Annual <span style={{ color: 'var(--green-600)', fontSize: 11, fontWeight: 600, marginLeft: 4 }}>−17%</span>
              </button>
              <button
                onClick={() => setAnnual(false)}
                style={{ padding: '8px 20px', borderRadius: 999, border: 'none', background: !annual ? '#fff' : 'transparent', boxShadow: !annual ? 'var(--shadow-xs)' : 'none', fontWeight: !annual ? 600 : 500, fontSize: 13, cursor: 'pointer', color: !annual ? 'var(--gray-900)' : 'var(--gray-600)', transition: 'all 0.15s ease' }}
              >
                Monthly
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
            {TIERS.map(({ name, monthlyPrice, annualPrice, sub, cap, features, featured, cta }) => {
              const price = annual ? annualPrice : monthlyPrice;
              return (
                <div
                  key={name}
                  style={{
                    padding: 32,
                    border: featured ? '2px solid var(--primary-600)' : '1px solid var(--border-default)',
                    borderRadius: 14,
                    background: featured ? 'linear-gradient(180deg, var(--primary-50) 0%, #fff 35%)' : '#fff',
                    position: 'relative',
                    boxShadow: featured ? '0 8px 32px -8px rgba(79,70,229,0.24)' : 'var(--shadow-xs)',
                  }}
                >
                  {featured && (
                    <div style={{ position: 'absolute', top: -13, left: 28 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: 'var(--primary-600)', color: '#fff', fontSize: 11.5, fontWeight: 600 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.8)' }} />Most popular
                      </span>
                    </div>
                  )}

                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 4 }}>{name}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--gray-500)', marginBottom: 22 }}>{sub}</div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    {price !== null ? (
                      <>
                        <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--gray-900)', lineHeight: 1 }}>${price}</span>
                        <span style={{ fontSize: 14, color: 'var(--gray-500)', marginLeft: 2 }}>/ mo</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--gray-900)', lineHeight: 1 }}>Custom</span>
                    )}
                  </div>
                  {price !== null && annual && (
                    <div style={{ fontSize: 12, color: 'var(--green-600)', marginBottom: 6, fontWeight: 500 }}>Billed annually — save ${(monthlyPrice! - annualPrice!) * 12}/yr</div>
                  )}

                  <div style={{ fontSize: 12, color: 'var(--gray-500)', fontFamily: 'monospace', marginBottom: 22, marginTop: price === null ? 8 : 0 }}>{cap}</div>

                  <Link
                    href="/login"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 44,
                      borderRadius: 10, fontWeight: 600, fontSize: 15, textDecoration: 'none', marginBottom: 24,
                      background: featured ? 'var(--primary-600)' : '#fff',
                      color: featured ? '#fff' : 'var(--gray-700)',
                      border: featured ? 'none' : '1px solid var(--border-default)',
                      transition: 'opacity 0.15s ease',
                    }}
                  >
                    {cta}
                  </Link>

                  <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {features.map(f => (
                      <div key={f} style={{ display: 'flex', gap: 10, padding: '4px 0', fontSize: 13.5, alignItems: 'flex-start', color: 'var(--gray-700)' }}>
                        {featured ? <CheckSVGFeatured /> : <CheckSVG />}
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--border-default)', padding: '96px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>FAQ</div>
            <h2 style={{ fontSize: 'clamp(28px,3.5vw,40px)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0, color: 'var(--gray-900)' }}>Common questions, plainly answered.</h2>
          </div>
          <div>
            {FAQ.map(({ q, a }) => <FAQItem key={q} q={q} a={a} />)}
          </div>
        </div>
      </section>

      <CTABand />
    </>
  );
}
