export default function ContactPage() {
  const contacts = [
    { label: 'Sales', email: 'sales@makhzoon.com', desc: 'Pricing, demos, procurement questions' },
    { label: 'Support', email: 'support@makhzoon.com', desc: 'Existing customers — fastest via in-app chat' },
    { label: 'Security', email: 'security@makhzoon.com', desc: 'Vulnerability disclosure, compliance docs' },
    { label: 'Press', email: 'press@makhzoon.com', desc: 'Media inquiries and press kit' },
  ];

  return (
    <section style={{ padding: '80px 32px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 80 }}>
        {/* Left */}
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary-600)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>Contact</div>
          <h1 style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.1, margin: '0 0 18px', color: 'var(--gray-900)' }}>Talk to a human.</h1>
          <p style={{ fontSize: 17, color: 'var(--gray-600)', lineHeight: 1.55, marginBottom: 40 }}>Real reply within one business day, usually faster. For urgent issues with a live workspace, use in-app chat.</p>

          <div style={{ marginBottom: 32 }}>
            {contacts.map(({ label, email, desc }) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>{label}</div>
                <div>
                  <a href={`mailto:${email}`} style={{ fontSize: 14, color: 'var(--primary-600)', fontFamily: 'monospace', textDecoration: 'none', display: 'block' }}>{email}</a>
                  <div style={{ fontSize: 12.5, color: 'var(--gray-500)', marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: 20, background: 'var(--primary-50)', borderRadius: 'var(--r-md)', border: '1px solid var(--primary-100)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--gray-900)' }}>Headquarters</div>
            <div style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.6 }}>Abdali Boulevard, Tower 4, Floor 9<br />Amman 11183, Jordan</div>
          </div>
        </div>

        {/* Form */}
        <div style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--r-lg)', padding: 32, height: 'fit-content', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 6, color: 'var(--gray-900)' }}>Send a message</div>
          <div style={{ fontSize: 13.5, color: 'var(--gray-500)', marginBottom: 22 }}>One business day, usually faster.</div>
          <form style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 6, display: 'block', color: 'var(--gray-700)' }}>First name</label>
                <input placeholder="Layla" style={{ width: '100%', height: 36, border: '1px solid var(--border-default)', borderRadius: 'var(--r-md)', padding: '0 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 6, display: 'block', color: 'var(--gray-700)' }}>Last name</label>
                <input placeholder="Hadid" style={{ width: '100%', height: 36, border: '1px solid var(--border-default)', borderRadius: 'var(--r-md)', padding: '0 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            {[['Work email', 'layla@acme.com'], ['Organization', 'Acme Corp']].map(([label, ph]) => (
              <div key={label}>
                <label style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 6, display: 'block', color: 'var(--gray-700)' }}>{label}</label>
                <input placeholder={ph} style={{ width: '100%', height: 36, border: '1px solid var(--border-default)', borderRadius: 'var(--r-md)', padding: '0 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 6, display: 'block', color: 'var(--gray-700)' }}>Approximate asset count</label>
              <select style={{ width: '100%', height: 36, border: '1px solid var(--border-default)', borderRadius: 'var(--r-md)', padding: '0 12px', fontSize: 14, fontFamily: 'inherit', background: '#fff', color: 'var(--gray-700)', outline: 'none' }}>
                <option>Less than 250</option>
                <option>250 – 1,000</option>
                <option>1,000 – 5,000</option>
                <option>5,000 – 25,000</option>
                <option>More than 25,000</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 6, display: 'block', color: 'var(--gray-700)' }}>Message</label>
              <textarea rows={4} placeholder="What problem are you trying to solve?" style={{ width: '100%', border: '1px solid var(--border-default)', borderRadius: 'var(--r-md)', padding: 12, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: 'var(--gray-900)', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" style={{ width: '100%', height: 44, borderRadius: 'var(--r-md)', background: 'var(--primary-600)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 6 }}>
              Send message
            </button>
            <div style={{ fontSize: 11.5, color: 'var(--gray-500)', textAlign: 'center' }}>
              By submitting, you agree to our <a href="#" style={{ color: 'var(--primary-600)' }}>Privacy Policy</a>.
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
