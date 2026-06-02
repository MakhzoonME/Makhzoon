import React from 'react';

/* ── Shared style constants ─────────���───────────────────────────────── */
const CARD: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  border: '1px solid var(--border-default)',
  overflow: 'hidden',
  boxShadow: '0 12px 32px -8px rgba(15,23,42,0.14), 0 0 0 1px var(--border-default)',
  width: '100%',
  fontSize: 12,
  userSelect: 'none',
  pointerEvents: 'none',
  fontFamily: 'var(--font-geist-sans, system-ui)',
};

const HDR: React.CSSProperties = {
  padding: '10px 14px',
  borderBottom: '1px solid var(--border-default)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'var(--gray-50)',
};

const ROW: React.CSSProperties = {
  padding: '9px 14px',
  borderBottom: '1px solid var(--gray-50)',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

/* ── Tiny inline SVG icons ──────────��───────────────────────────────── */
function LaptopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1" y="2" width="12" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 13h6M7 10v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function MonitorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1" y="1.5" width="12" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 13.5h5M7 10.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="3.5" y="0.5" width="7" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="7" cy="11.5" r="0.8" fill="currentColor" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 1.5L2 3.5v4C2 10 4.5 12.5 7 13c2.5-.5 5-3 5-5.5v-4L7 1.5z" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.5 3.5v3L8.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function QRIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <rect x="1" y="1" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="2.5" y="2.5" width="2" height="2" fill="currentColor" />
      <rect x="9" y="1" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="10.5" y="2.5" width="2" height="2" fill="currentColor" />
      <rect x="1" y="9" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="2.5" y="10.5" width="2" height="2" fill="currentColor" />
      <rect x="9" y="9" width="2" height="2" fill="currentColor" />
      <rect x="13" y="9" width="1" height="2" fill="currentColor" />
      <rect x="9" y="13" width="2" height="1" fill="currentColor" />
      <rect x="12" y="12" width="2" height="3" fill="currentColor" />
      <rect x="11" y="11" width="1" height="1" fill="currentColor" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ── Status badge ─────────────────────────────────────────────────── */
type StatusKey = 'Active' | 'Maintenance' | 'Expired' | 'Expiring' | 'Pending' | 'Approved';
const STATUS: Record<StatusKey, { bg: string; color: string }> = {
  Active:      { bg: 'var(--green-100)',  color: 'var(--green-700)'  },
  Approved:    { bg: 'var(--green-100)',  color: 'var(--green-700)'  },
  Maintenance: { bg: 'var(--yellow-100)', color: 'var(--yellow-700)' },
  Expiring:    { bg: 'var(--yellow-100)', color: 'var(--yellow-700)' },
  Pending:     { bg: 'var(--yellow-100)', color: 'var(--yellow-700)' },
  Expired:     { bg: 'var(--red-100)',    color: 'var(--red-700)'    },
};
function Pill({ status }: { status: StatusKey }) {
  const s = STATUS[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999, background: s.bg, color: s.color, fontSize: 10.5, fontWeight: 500, lineHeight: 1.4 }}>
      <span style={{ width: 4.5, height: 4.5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {status}
    </span>
  );
}

/* ── Icon badge ─────────────────────────────────────────────────────── */
function IconBadge({ children, color = 'var(--primary-50)', fg = 'var(--primary-600)' }: { children: React.ReactNode; color?: string; fg?: string }) {
  return (
    <div style={{ width: 30, height: 30, borderRadius: 8, background: color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: fg }}>
      {children}
    </div>
  );
}

/* ══════════════════��════════════════════════════���════════════════════
   1. Assets feature preview
   ════════════════════════════════��═══════════════════════════════════ */
export function AssetsPreview() {
  const items = [
    { Icon: LaptopIcon, name: 'MacBook Pro 14"',  tag: 'MBP-2024-014', assignee: 'Ahmed Al-Rashid',  status: 'Active'      as StatusKey },
    { Icon: MonitorIcon, name: 'Dell Monitor 27"', tag: 'MON-2024-021', assignee: 'Sara Johnson',      status: 'Active'      as StatusKey },
    { Icon: PhoneIcon,  name: 'iPhone 15 Pro',     tag: 'PHN-2023-008', assignee: 'Lana Khoury',       status: 'Maintenance' as StatusKey },
  ];
  return (
    <div style={CARD}>
      <div style={HDR}>
        <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>Assets</span>
        <span style={{ color: 'var(--gray-400)', fontSize: 11 }}>247 total</span>
      </div>
      {items.map(({ Icon, name, tag, assignee, status }) => (
        <div key={tag} style={ROW}>
          <IconBadge><Icon /></IconBadge>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, color: 'var(--gray-900)', marginBottom: 2 }}>{name}</div>
            <div style={{ fontSize: 10.5, color: 'var(--gray-400)', fontFamily: 'monospace' }}>{tag} · {assignee}</div>
          </div>
          <Pill status={status} />
        </div>
      ))}
      <div style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--primary-50)', borderTop: '1px solid var(--primary-100)' }}>
        <span style={{ color: 'var(--primary-600)' }}><QRIcon /></span>
        <span style={{ fontSize: 11, color: 'var(--primary-700)', fontWeight: 500 }}>QR codes auto-generated — scan to assign</span>
      </div>
    </div>
  );
}

/* ═══════════��═══════════���════════════════════════════════��═══════════
   2. Warranties feature preview
   ═════════════════════════════════════��═════════════════════════════��� */
export function WarrantiesPreview() {
  const warranties = [
    { name: 'MacBook Pro 14"', vendor: 'Apple',  days: 7,    pct: 94, key: 'critical' },
    { name: 'Cisco Switch 48P', vendor: 'Cisco', days: 28,   pct: 72, key: 'warning'  },
    { name: 'Dell Monitor 27"', vendor: 'Dell',  days: 180,  pct: 40, key: 'ok'       },
  ];
  const barColors: Record<string, string> = {
    critical: 'var(--red-500)',
    warning:  'var(--yellow-500)',
    ok:       'var(--green-500)',
  };
  const daysColor: Record<string, string> = {
    critical: 'var(--red-700)',
    warning:  'var(--yellow-700)',
    ok:       'var(--green-700)',
  };
  const daysBg: Record<string, string> = {
    critical: 'var(--red-100)',
    warning:  'var(--yellow-100)',
    ok:       'var(--green-100)',
  };

  return (
    <div style={CARD}>
      <div style={HDR}>
        <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>Warranties</span>
        <span style={{ fontSize: 11, color: 'var(--red-600)', fontWeight: 500 }}>1 critical</span>
      </div>
      {warranties.map(({ name, vendor, days, pct, key }) => (
        <div key={name} style={{ ...ROW, flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--gray-900)' }}>{name}</div>
              <div style={{ fontSize: 10.5, color: 'var(--gray-500)', marginTop: 1 }}>{vendor}</div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999, background: daysBg[key], color: daysColor[key], fontSize: 10.5, fontWeight: 600 }}>
              <ClockIcon />{days < 30 ? `${days}d left` : `${days}d`}
            </span>
          </div>
          <div style={{ background: 'var(--gray-100)', borderRadius: 999, height: 4 }}>
            <div style={{ height: 4, borderRadius: 999, background: barColors[key], width: `${pct}%`, transition: 'width 0.3s ease' }} />
          </div>
        </div>
      ))}
      <div style={{ padding: '9px 14px', background: 'var(--gray-50)', borderTop: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: 'var(--primary-600)' }}><ShieldIcon /></span>
        <span style={{ fontSize: 11, color: 'var(--gray-600)' }}>Alerts at 30, 14 and 7 days before expiry</span>
      </div>
    </div>
  );
}

/* ════════════════════���═════════════════════════════���═════════════════
   3. Requests feature preview
   ════════════════════════════════════════════════════════════════════ */
export function RequestsPreview() {
  return (
    <div style={CARD}>
      <div style={HDR}>
        <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>Requests</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999, background: 'var(--yellow-100)', color: 'var(--yellow-700)', fontSize: 10.5, fontWeight: 500 }}>
          <span style={{ width: 4.5, height: 4.5, borderRadius: '50%', background: 'var(--yellow-700)' }} />3 pending
        </span>
      </div>

      {/* Request card */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-default)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--gray-900)', marginBottom: 2 }}>Purchase Request</div>
            <div style={{ fontSize: 10.5, color: 'var(--gray-400)', fontFamily: 'monospace' }}>#REQ-042</div>
          </div>
          <Pill status="Pending" />
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--gray-600)', lineHeight: 1.5, marginBottom: 10, padding: '8px 10px', background: 'var(--gray-50)', borderRadius: 6, border: '1px solid var(--border-default)' }}>
          &ldquo;Standing desk for the new hire joining next Monday&rdquo;
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: 'var(--primary-700)', flexShrink: 0 }}>S</div>
          <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>Sarah Johnson · 2h ago</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, background: 'var(--green-600)', color: '#fff', border: 'none', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
            <CheckIcon />Approve
          </button>
          <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, background: '#fff', color: 'var(--gray-700)', border: '1px solid var(--border-default)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer' }}>
            <XIcon />Deny
          </button>
        </div>
      </div>

      {/* Second request (compact) */}
      <div style={{ ...ROW, opacity: 0.7 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, color: 'var(--gray-900)' }}>Repair Request</div>
          <div style={{ fontSize: 10.5, color: 'var(--gray-400)', marginTop: 1 }}>#REQ-041 · Omar · 1d ago</div>
        </div>
        <Pill status="Pending" />
      </div>
    </div>
  );
}

/* ══════════════════════════════════���═══════════════════════════════��═
   4. Audit log feature preview
   ══════════════════════════════════════════════��═════════════════════ */
function ActionBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '1.5px 6px', borderRadius: 4, background: color, color: '#fff', fontFamily: 'monospace', fontSize: 10, fontWeight: 600, letterSpacing: '0.02em' }}>
      {label}
    </span>
  );
}

export function AuditLogPreview() {
  const entries = [
    {
      time: '09:42 AM',
      user: 'admin@company.com',
      action: 'ASSET_UPDATED',
      color: 'var(--primary-600)',
      detail: 'status',
      before: '"Active"',
      after: '"Retired"',
    },
    {
      time: 'Yesterday',
      user: 'staff@company.com',
      action: 'ASSET_CREATED',
      color: 'var(--green-600)',
      detail: 'name',
      before: null,
      after: '"MacBook Pro 14” · MBP-2024-015"',
    },
    {
      time: '2d ago',
      user: 'admin@company.com',
      action: 'INVITE_SENT',
      color: 'var(--blue-600)',
      detail: 'email',
      before: null,
      after: '"new.hire@company.com"',
    },
  ];
  return (
    <div style={CARD}>
      <div style={HDR}>
        <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>Audit Log</span>
        <span style={{ fontSize: 11, color: 'var(--gray-400)', fontFamily: 'monospace' }}>append-only</span>
      </div>
      {entries.map(({ time, user, action, color, detail, before, after }) => (
        <div key={action + time} style={{ ...ROW, flexDirection: 'column', alignItems: 'stretch', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ActionBadge label={action} color={color} />
            </div>
            <span style={{ fontSize: 10, color: 'var(--gray-400)', fontFamily: 'monospace' }}>{time}</span>
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--gray-500)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--gray-300)', flexShrink: 0 }} />
            {user}
          </div>
          {before !== null && (
            <div style={{ display: 'flex', gap: 5, fontSize: 10.5, fontFamily: 'monospace', padding: '4px 8px', background: 'var(--gray-50)', borderRadius: 5, border: '1px solid var(--border-default)' }}>
              <span style={{ color: 'var(--gray-400)' }}>{detail}:</span>
              <span style={{ color: 'var(--red-600)', textDecoration: 'line-through' }}>{before}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden style={{ color: 'var(--gray-400)' }}><path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ color: 'var(--green-700)' }}>{after}</span>
            </div>
          )}
          {before === null && (
            <div style={{ fontSize: 10.5, fontFamily: 'monospace', padding: '4px 8px', background: 'var(--gray-50)', borderRadius: 5, border: '1px solid var(--border-default)', color: 'var(--green-700)' }}>
              {detail}: {after}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
