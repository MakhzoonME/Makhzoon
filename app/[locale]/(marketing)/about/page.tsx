import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { CTABand } from '@/components/marketing/CTABand';
import { ChevronRight } from 'lucide-react';

const VALUES = [
  { num: '01', name: 'Trustworthy', desc: 'Accurate data, audit trails, no surprises.' },
  { num: '02', name: 'Clear', desc: 'No guessing what a button does, ever.' },
  { num: '03', name: 'Efficient', desc: 'Minimal clicks. Power features for power users.' },
  { num: '04', name: 'Professional', desc: 'Enterprise-grade — no decoration for its own sake.' },
  { num: '05', name: 'Precise', desc: '"17 active assets," not "many assets."' },
];

const TEAM = [
  { name: 'Layla Hadid', role: 'Co-founder & CEO', bg: 'Previously Operations at Aramex.' },
  { name: 'Omar Tabbal', role: 'Co-founder & CTO', bg: 'Built compliance tooling at PwC.' },
  { name: 'Maya Rifai', role: 'Head of Design', bg: 'Design systems at Algolia.' },
  { name: 'Sami Khoury', role: 'Head of Engineering', bg: 'Infra at AWS.' },
];

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('');
}

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section style={{ padding: '80px 32px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>About</div>
            <h1 style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.1, margin: '0 0 22px', color: 'var(--gray-900)' }}>We named the company &ldquo;stored&rdquo; — and meant it.</h1>
            <p style={{ fontSize: 18, color: 'var(--gray-600)', lineHeight: 1.55, margin: 0 }}>Makhzoon (مخزون) is the Arabic word for &ldquo;stored&rdquo; or &ldquo;inventoried.&rdquo; It carries connotations of custody, stewardship, and reliable record-keeping — the three things every operations team needs from their asset platform, and the three things spreadsheets can&apos;t deliver.</p>
          </div>
          <div style={{ background: 'radial-gradient(at 30% 30%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(at 70% 70%, rgba(124,58,237,0.16), transparent 60%), #fff', border: '1px solid var(--border-default)', borderRadius: 'var(--r-lg)', padding: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 380 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              <MakhzoonMark size={140} />
              <span style={{ fontSize: 50, color: 'var(--gray-900)', fontWeight: 700, letterSpacing: '-0.02em' }}>Makhzoon</span>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--border-default)', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 48, textAlign: 'center' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Values</div>
            <h2 style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0, color: 'var(--gray-900)' }}>Five things we hold ourselves to.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            {VALUES.map(({ num, name, desc }) => (
              <div key={name} style={{ padding: 24, background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)' }}>{num}</div>
                <div style={{ fontSize: 17, fontWeight: 600, margin: '8px 0', color: 'var(--gray-900)' }}>{name}</div>
                <div style={{ fontSize: 13.5, color: 'var(--gray-600)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{ background: '#fff', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Team</div>
            <h2 style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0, color: 'var(--gray-900)' }}>Built in Amman. Trusted globally.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 48 }}>
            {TEAM.map(({ name, role, bg }) => (
              <div key={name}>
                <div style={{ aspectRatio: '1/1', background: 'linear-gradient(135deg, var(--primary-100), var(--primary-50))', borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(79,70,229,0.06) 8px, rgba(79,70,229,0.06) 16px)' }} />
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary-600)', position: 'relative' }}>{initials(name)}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-900)' }}>{name}</div>
                <div style={{ fontSize: 13, color: 'var(--primary-600)', marginBottom: 6 }}>{role}</div>
                <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{bg}</div>
              </div>
            ))}
          </div>

          {/* Hiring band */}
          <div style={{ padding: 32, background: 'var(--gray-50)', border: '1px solid var(--border-default)', borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4, color: 'var(--gray-900)' }}>We&apos;re hiring across engineering, design, and customer success.</div>
              <div style={{ fontSize: 14, color: 'var(--gray-600)' }}>Remote-first across MENA + EU. Equity for everyone.</div>
            </div>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 'var(--r-md)', background: 'var(--primary-600)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              View open roles <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </section>

      <CTABand />
    </>
  );
}
