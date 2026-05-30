'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CTABand } from '@/components/marketing/CTABand';
import { INCLUSION_KEYS, INCLUSION_LABELS, type InclusionKey } from '@/types';

interface PublicTier {
  id: string;
  name: string;
  description: string;
  pricing: { monthlyPrice: number | null; annualPrice: number | null; currency: string; isCustom: boolean };
  trialDays: number;
  sortOrder: number;
  limits: { maxAssets: number; maxUsers: number; maxSpaces: number; maxInventoryItems: number };
  inclusions: Record<InclusionKey, boolean>;
}

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

const FAQ = [
  { q: 'What counts as an "asset"?', a: "Any record you create — a laptop, a license, a vehicle, a piece of equipment. Retired assets keep their history but don't count toward your limit." },
  { q: 'How are users and spaces counted?', a: 'Each tier includes a set number of users and spaces (branches / locations). When you reach a limit, move up to the next tier — there are no per-overage charges.' },
  { q: 'What happens if we hit a limit?', a: "You'll get a heads-up as you approach the cap. To add more assets, users, spaces, or inventory items, upgrade to the next tier whenever you're ready." },
  { q: 'How does the free trial work?', a: 'Every plan includes a 3-month free trial. No credit card to start. After the trial, pick a plan or export your data and walk away.' },
  { q: 'Can I pay annually?', a: 'Yes — annual billing gives you two months free versus paying monthly. You can switch between monthly and annual at any renewal.' },
  { q: 'Do you offer custom / Enterprise plans?', a: 'Yes. Enterprise is a negotiated deal with unlimited usage, dedicated onboarding, and a custom SLA. Contact sales to scope it.' },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 10, overflow: 'hidden', marginBottom: 10, transition: 'box-shadow 0.15s ease' }}>
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

function fmtLimit(n: number): string {
  return n === -1 ? 'Unlimited' : n.toLocaleString();
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.makhzoon.me';

export default function PricingPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';
  const [annual, setAnnual] = useState(true);
  const [tiers, setTiers] = useState<PublicTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/packages/public')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PublicTier[]) => {
        if (active) setTiers(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      {/* Hero */}
      <section style={{ padding: '88px 32px 32px', textAlign: 'center', background: 'linear-gradient(180deg, #fff 0%, var(--surface-page) 100%)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>Pricing</div>
          <h1 style={{ fontSize: 'clamp(38px,5vw,60px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.06, margin: '0 0 22px', color: 'var(--gray-900)' }}>
            Simple, predictable,<br />pick the tier that fits.
          </h1>
          <p style={{ fontSize: 19, color: 'var(--gray-600)', lineHeight: 1.55, margin: 0 }}>One flat price per tier, generous usage limits, and a 3-month free trial on every plan.</p>
        </div>
      </section>

      {/* Tiers */}
      <section style={{ background: '#fff', padding: '48px 32px 96px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          {/* Toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', padding: 4, background: 'var(--gray-100)', borderRadius: 999 }}>
              <button
                onClick={() => setAnnual(true)}
                style={{ padding: '8px 20px', borderRadius: 999, border: 'none', background: annual ? '#fff' : 'transparent', boxShadow: annual ? 'var(--shadow-xs)' : 'none', fontWeight: annual ? 600 : 500, fontSize: 13, cursor: 'pointer', color: annual ? 'var(--gray-900)' : 'var(--gray-600)', transition: 'all 0.15s ease' }}
              >
                Annual <span style={{ color: 'var(--green-600)', fontSize: 11, fontWeight: 600, marginLeft: 4 }}>2 months free</span>
              </button>
              <button
                onClick={() => setAnnual(false)}
                style={{ padding: '8px 20px', borderRadius: 999, border: 'none', background: !annual ? '#fff' : 'transparent', boxShadow: !annual ? 'var(--shadow-xs)' : 'none', fontWeight: !annual ? 600 : 500, fontSize: 13, cursor: 'pointer', color: !annual ? 'var(--gray-900)' : 'var(--gray-600)', transition: 'all 0.15s ease' }}
              >
                Monthly
              </button>
            </div>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--gray-500)' }}>Loading plans…</p>
          ) : tiers.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--gray-500)' }}>Pricing is being finalized. Please check back soon.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, alignItems: 'start' }}>
              {tiers.map((tier, idx) => {
                const { name, description, pricing, trialDays, limits, inclusions } = tier;
                const featured = idx === 1; // highlight the second tier ("Pro")
                const custom = pricing.isCustom;
                // annualPrice is a per-year total; show the per-month equivalent.
                const monthlyEquiv =
                  annual && pricing.annualPrice != null ? Math.round(pricing.annualPrice / 12) : pricing.monthlyPrice;
                const annualSaving =
                  pricing.monthlyPrice != null && pricing.annualPrice != null
                    ? pricing.monthlyPrice * 12 - pricing.annualPrice
                    : 0;
                const cap = `${fmtLimit(limits.maxUsers)} users · ${fmtLimit(limits.maxAssets)} assets · ${fmtLimit(limits.maxSpaces)} spaces`;
                const enabledInclusions = INCLUSION_KEYS.filter((k) => inclusions?.[k]).map((k) => INCLUSION_LABELS[k]);
                const featureLines = [
                  ...(trialDays > 0 ? [`${trialDays}-day free trial`] : []),
                  `Up to ${fmtLimit(limits.maxInventoryItems)} inventory items`,
                  ...enabledInclusions,
                ];
                const cta = custom ? 'Contact sales' : 'Start free trial';
                const href = custom ? `/${locale}/contact` : `${APP_URL}/${locale}/login`;

                return (
                  <div
                    key={tier.id}
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
                    <div style={{ fontSize: 13.5, color: 'var(--gray-500)', marginBottom: 22, minHeight: 38 }}>{description}</div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                      {monthlyEquiv != null ? (
                        <>
                          {custom && <span style={{ fontSize: 14, color: 'var(--gray-500)', marginRight: 2 }}>from</span>}
                          <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--gray-900)', lineHeight: 1 }}>
                            {pricing.currency === 'USD' ? '$' : ''}{monthlyEquiv}
                          </span>
                          <span style={{ fontSize: 14, color: 'var(--gray-500)', marginLeft: 2 }}>
                            {pricing.currency !== 'USD' ? `${pricing.currency} ` : ''}/ mo
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--gray-900)', lineHeight: 1 }}>Custom</span>
                      )}
                    </div>
                    {!custom && annual && annualSaving > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--green-600)', marginBottom: 6, fontWeight: 500 }}>
                        Billed annually — save {pricing.currency === 'USD' ? '$' : ''}{annualSaving}{pricing.currency !== 'USD' ? ` ${pricing.currency}` : ''}/yr
                      </div>
                    )}

                    <div style={{ fontSize: 12, color: 'var(--gray-500)', fontFamily: 'monospace', marginBottom: 22, marginTop: monthlyEquiv == null ? 8 : 0 }}>{cap}</div>

                    <Link
                      href={href}
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
                      {featureLines.map((f) => (
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
          )}
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
