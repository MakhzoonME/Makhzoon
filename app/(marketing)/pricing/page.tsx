'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { CTABand } from '@/components/marketing/CTABand';

const TIERS = [
  {
    name: 'Starter',
    monthlyPrice: 59,
    annualPrice: 49,
    sub: 'For small teams getting organized.',
    cap: 'Up to 250 assets · Unlimited users',
    features: ['QR codes & CSV import', 'Warranty tracking', 'Basic reports', 'Email support', '14-day audit log retention'],
    featured: false,
  },
  {
    name: 'Business',
    monthlyPrice: 179,
    annualPrice: 149,
    sub: 'For growing operations teams.',
    cap: 'Up to 2,500 assets · Unlimited users',
    features: ['Everything in Starter', 'Approval workflows + requests', 'Maintenance records', 'Audit logs (1 year)', 'SSO (Google, Microsoft)', 'API access + webhooks'],
    featured: true,
  },
  {
    name: 'Enterprise',
    monthlyPrice: null,
    annualPrice: null,
    sub: 'For organizations with compliance needs.',
    cap: 'Unlimited assets · Multi-tenant',
    features: ['Everything in Business', 'SAML SSO + SCIM', 'Audit logs (forever)', 'Custom roles & permissions', 'SLA + dedicated CSM', 'On-prem deployment option'],
    featured: false,
  },
];

const FAQ = [
  ['What counts as an "asset"?', "Any record you create — a laptop, a license, a vehicle, a piece of equipment. Retired assets keep their history but don't count toward your limit."],
  ['Are users charged separately?', 'No. Invite your whole organization. Pricing is on assets only.'],
  ['Can we exceed our asset cap?', "You'll get a notification at 80% and a soft warning at 100%. We never auto-charge or block you — pick the next tier when ready."],
  ['Do you offer non-profit pricing?', 'Yes. 501(c)(3) and registered non-profits get 40% off any plan. Email sales@makhzoon.com with your registration.'],
  ['How does the 14-day trial work?', "Full Business-tier access. No credit card. After 14 days, you keep your data — pick a plan, downgrade to Starter, or export and walk away."],
  ['Can we self-host?', 'Enterprise customers can run Makhzoon on-premise or in a private VPC with the same managed-update cadence.'],
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <>
      {/* Hero */}
      <section style={{ padding: '80px 32px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>Pricing</div>
          <h1 style={{ fontSize: 60, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 0 22px', color: 'var(--gray-900)' }}>Simple, predictable, no per-seat traps.</h1>
          <p style={{ fontSize: 19, color: 'var(--gray-600)', lineHeight: 1.5, margin: 0 }}>Pricing scales with assets, not users. Invite your whole org from day one.</p>
        </div>
      </section>

      {/* Tiers */}
      <section style={{ background: '#fff', padding: '48px 32px 96px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', padding: 4, background: 'var(--gray-100)', borderRadius: 999 }}>
              <button onClick={() => setAnnual(true)} style={{ padding: '8px 18px', borderRadius: 999, border: 'none', background: annual ? '#fff' : 'transparent', boxShadow: annual ? 'var(--shadow-xs)' : 'none', fontWeight: 500, fontSize: 13, cursor: 'pointer', color: annual ? 'var(--gray-900)' : 'var(--gray-600)' }}>
                Annual <span style={{ color: 'var(--primary-600)', fontSize: 11, marginLeft: 4 }}>−17%</span>
              </button>
              <button onClick={() => setAnnual(false)} style={{ padding: '8px 18px', borderRadius: 999, border: 'none', background: !annual ? '#fff' : 'transparent', boxShadow: !annual ? 'var(--shadow-xs)' : 'none', fontWeight: 500, fontSize: 13, cursor: 'pointer', color: !annual ? 'var(--gray-900)' : 'var(--gray-600)' }}>
                Monthly
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {TIERS.map(({ name, monthlyPrice, annualPrice, sub, cap, features, featured }) => {
              const price = annual ? annualPrice : monthlyPrice;
              return (
                <div key={name} style={{ padding: 32, border: featured ? '2px solid var(--primary-600)' : '1px solid var(--border-default)', borderRadius: 'var(--r-lg)', background: featured ? 'linear-gradient(180deg, var(--primary-50), #fff 40%)' : '#fff', position: 'relative', boxShadow: featured ? 'var(--shadow-md)' : 'var(--shadow-xs)' }}>
                  {featured && (
                    <div style={{ position: 'absolute', top: -12, left: 28 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 10px', borderRadius: 999, background: 'var(--primary-100)', color: 'var(--primary-700)', fontSize: 12, fontWeight: 600 }}>Most popular</span>
                    </div>
                  )}
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-900)', marginBottom: 6 }}>{name}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--gray-500)', marginBottom: 20 }}>{sub}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                    {price !== null ? (
                      <>
                        <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--gray-900)' }}>${price}</span>
                        <span style={{ fontSize: 14, color: 'var(--gray-500)' }}>/ month</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--gray-900)' }}>Custom</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', fontFamily: 'monospace', marginBottom: 22 }}>{cap}</div>
                  <Link
                    href="/login"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 44, borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none', marginBottom: 22, background: featured ? 'var(--primary-600)' : '#fff', color: featured ? '#fff' : 'var(--gray-700)', border: featured ? 'none' : '1px solid var(--border-default)' }}
                  >
                    {name === 'Enterprise' ? 'Contact sales' : 'Start free trial'}
                  </Link>
                  <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 16 }}>
                    {features.map(f => (
                      <div key={f} style={{ display: 'flex', gap: 10, padding: '6px 0', fontSize: 13.5, alignItems: 'center', color: 'var(--gray-700)' }}>
                        <CheckCircle2 size={14} color="var(--primary-600)" style={{ flexShrink: 0 }} />{f}
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
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>FAQ</div>
            <h2 style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0, color: 'var(--gray-900)' }}>Common questions, plainly answered.</h2>
          </div>
          <div>
            {FAQ.map(([q, a], i) => (
              <details key={i} style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 10 }}>
                <summary style={{ fontSize: 15, fontWeight: 500, cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--gray-900)' }}>
                  {q}<span style={{ color: 'var(--gray-400)' }}>+</span>
                </summary>
                <div style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.6, marginTop: 12 }}>{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <CTABand />
    </>
  );
}
