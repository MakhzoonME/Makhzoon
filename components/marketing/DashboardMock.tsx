const ASSETS = [
  { name: 'MacBook Pro 14"', tag: 'MBP-2024-014', assignee: 'Layla Hadid', status: 'Active', category: 'Laptop' },
  { name: 'Dell Monitor 27"', tag: 'MON-2024-021', assignee: 'Omar Tabbal', status: 'Active', category: 'Monitor' },
  { name: 'iPhone 15 Pro', tag: 'PHN-2023-008', assignee: 'Maya Rifai', status: 'Active', category: 'Mobile' },
  { name: 'Cisco Switch 48P', tag: 'NET-2022-003', assignee: 'IT Room B', status: 'Maintenance', category: 'Network' },
  { name: 'Ergonomic Chair', tag: 'FRN-2024-042', assignee: 'Sami Khoury', status: 'Active', category: 'Furniture' },
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Active: { bg: 'var(--green-100)', color: 'var(--green-700)' },
  Maintenance: { bg: 'var(--yellow-100)', color: 'var(--yellow-700)' },
  Retired: { bg: 'var(--gray-100)', color: 'var(--gray-600)' },
};

const NAV_ITEMS = ['Dashboard', 'Assets', 'Warranties', 'Requests', 'Reports'];

export function DashboardMock() {
  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'var(--font-geist-sans, system-ui)', background: 'var(--surface-page)' }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: '#fff', borderRight: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 64 64" fill="none">
                <path d="M14 16H22L26 22L32 16L38 22L42 16H50V22H14Z" fill="white" opacity="0.92" />
                <rect x="14" y="27" width="36" height="6" fill="white" opacity="0.78" rx="1" />
                <rect x="14" y="38" width="10" height="10" fill="white" rx="1" />
                <rect x="28" y="38" width="8" height="10" fill="white" rx="1" opacity="0.85" />
                <rect x="40" y="38" width="10" height="10" fill="white" rx="1" />
              </svg>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>Makhzoon</span>
          </div>
        </div>
        <nav style={{ padding: '10px 8px', flex: 1 }}>
          {NAV_ITEMS.map((item, i) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, marginBottom: 2, background: i === 0 ? 'var(--primary-50)' : 'transparent', color: i === 0 ? 'var(--primary-700)' : 'var(--gray-600)', fontSize: 13, fontWeight: i === 0 ? 600 : 500, position: 'relative' }}>
              {i === 0 && <span style={{ position: 'absolute', left: 0, top: 4, bottom: 4, width: 2, background: 'var(--primary-600)', borderRadius: 2 }} />}
              <span style={{ width: 16, height: 16, borderRadius: 3, background: i === 0 ? 'var(--primary-100)' : 'var(--gray-100)', display: 'inline-block' }} />
              {item}
            </div>
          ))}
        </nav>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{ height: 52, background: '#fff', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-900)', flex: 1 }}>Dashboard</span>
          <div style={{ height: 7, width: 140, borderRadius: 4, background: 'var(--gray-100)' }} />
          <div style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--primary-700)' }}>L</div>
        </div>

        <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Assets', value: '247', delta: '+12 this month', color: 'var(--primary-600)' },
              { label: 'Active', value: '231', delta: '93.5% of total', color: 'var(--green-600)' },
              { label: 'Warranties expiring', value: '8', delta: 'Within 30 days', color: 'var(--yellow-600)' },
              { label: 'Open Requests', value: '5', delta: '2 pending approval', color: 'var(--blue-600)' },
            ].map(({ label, value, delta, color }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 10, padding: '14px 16px', boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 6, fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{delta}</div>
              </div>
            ))}
          </div>

          {/* Asset table */}
          <div style={{ background: '#fff', border: '1px solid var(--border-default)', borderRadius: 10, boxShadow: 'var(--shadow-xs)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>Recent Assets</span>
              <div style={{ fontSize: 11, color: 'var(--primary-600)', fontWeight: 500 }}>View all →</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)' }}>
                  {['Name', 'Tag', 'Assignee', 'Category', 'Status'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-default)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ASSETS.map(({ name, tag, assignee, status, category }) => {
                  const sc = STATUS_COLORS[status] ?? STATUS_COLORS.Active;
                  return (
                    <tr key={tag} style={{ borderBottom: '1px solid var(--border-default)' }}>
                      <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 500, color: 'var(--gray-900)' }}>{name}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--gray-500)', fontFamily: 'monospace' }}>{tag}</td>
                      <td style={{ padding: '9px 14px', fontSize: 13, color: 'var(--gray-700)' }}>{assignee}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--gray-500)' }}>{category}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 500 }}>
                          <span style={{ width: 5, height: 5, borderRadius: 999, background: sc.color }} />{status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
