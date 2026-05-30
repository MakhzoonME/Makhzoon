'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useOrgSlug, useSpace } from '@/hooks/ui';
import { useAuthStore } from '@/store/auth.store';
import { useT } from '@/hooks/ui';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { formatDate, daysUntil } from '@/lib/utils/date';
import { Asset, Warranty, Request } from '@/types';
import { MessageKey } from '@/locales/messages';

/* ── Inline SVG icons ───────────────────────────────────────────── */
function ActiveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M15 5.5L9 2 3 5.5v7L9 16l6-3.5v-7z" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M9 2v14M3 5.5l6 3.5 6-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function _RetiredIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 7h12M5 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="3" y="7" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M7.5 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function WarningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M9 2L1.5 15h15L9 2z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <path d="M9 8v3.5M9 13.5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function TotalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="2" y="2" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <rect x="10" y="2" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <rect x="2" y="10" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <rect x="10" y="10" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </svg>
  );
}
function InboxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M16 9h-4l-1.5 2.5h-3L6 9H2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 4.5l-2 4.5v5a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 16 14V9l-2-4.5a1.5 1.5 0 0 0-1.35-.85H5.35A1.5 1.5 0 0 0 4 4.5z" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ── Greeting helper ─────────────────────────────────────────────── */
function getGreetingKey(): 'greeting.morning' | 'greeting.afternoon' | 'greeting.evening' {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'greeting.morning';
  if (h >= 12 && h < 20) return 'greeting.afternoon';
  return 'greeting.evening';
}

/* ── Data fetcher ────────────────────────────────────────────────── */
function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [assetsRes, warrantiesRes, requestsRes, auditRes] = await Promise.all([
        fetch('/api/assets'),
        fetch('/api/warranties?expiringSoon=true'),
        fetch('/api/requests?status=PENDING&limit=5'),
        fetch('/api/audit-logs?limit=4'),
      ]);
      const assetsBody = assetsRes.ok ? await assetsRes.json() : { items: [] };
      const warrantiesBody = warrantiesRes.ok ? await warrantiesRes.json() : [];
      const requestsBody = requestsRes.ok ? await requestsRes.json() : [];
      const auditBody = auditRes.ok ? await auditRes.json() : [];
      const assets: Asset[] = Array.isArray(assetsBody?.items) ? assetsBody.items : [];
      const warranties: Warranty[] = Array.isArray(warrantiesBody) ? warrantiesBody : [];
      const requests: Request[] = Array.isArray(requestsBody) ? requestsBody : (Array.isArray(requestsBody?.items) ? requestsBody.items : []);
      const auditLogs: AuditEntry[] = Array.isArray(auditBody) ? auditBody : (Array.isArray(auditBody?.items) ? auditBody.items : []);
      return { assets, warranties, requests, auditLogs };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/* ── Types ───────────────────────────────────────────────────────── */
type AuditEntry = {
  id: string;
  actorName?: string;
  actorEmail?: string;
  action: string;
  module?: string;
  targetId?: string;
  createdAt: string | number;
};

/* ── StatCard ────────────────────────────────────────────────────── */
type StatCardProps = {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  sub?: string;
  onClick?: () => void;
};

function StatCard({ icon, iconBg, iconColor, label, value, sub, onClick }: StatCardProps) {
  return (
    <Card
      className={`transition-all duration-150 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div
            className="p-2 rounded-lg flex-shrink-0"
            style={{ background: iconBg, color: iconColor }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">{label}</p>
            {value}
            {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonValue() {
  return <div className="h-7 w-14 bg-surface-sidebar rounded animate-pulse" />;
}

/* ── AssetBreakdownBar ───────────────────────────────────────────── */
function AssetBreakdownBar({ assets, isLoading }: { assets: Asset[]; isLoading: boolean }) {
  const { t } = useT();
  const categories: Record<string, number> = {};
  for (const a of assets) {
    if (a.status === 'Retired') continue;
    categories[a.category] = (categories[a.category] ?? 0) + 1;
  }
  const total = Object.values(categories).reduce((s, n) => s + n, 0) || 1;
  const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const TONES: Record<number, { bar: string; text: string }> = {
    0: { bar: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-400' },
    1: { bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
    2: { bar: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-400' },
    3: { bar: 'bg-gray-400', text: 'text-gray-600' },
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="grid grid-cols-[130px_1fr_64px] gap-3 items-center">
            <div className="h-4 bg-surface-sidebar rounded animate-pulse" />
            <div className="h-1.5 bg-surface-sidebar rounded-full animate-pulse" />
            <div className="h-4 w-12 bg-surface-sidebar rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">{t('dashboard.noAssets')}</p>;
  }

  return (
    <div className="space-y-3">
      {sorted.map(([cat, count], i) => {
        const pct = Math.round((count / total) * 100);
        const tone = TONES[i] ?? TONES[3];
        return (
          <div key={cat} className="grid grid-cols-[130px_1fr_64px] gap-3 items-center py-1 border-b border-border last:border-0">
            <span className="text-sm font-medium text-gray-700 truncate">{cat}</span>
            <div className="h-1.5 rounded-full bg-surface-sidebar overflow-hidden">
              <div
                className={`h-full rounded-full ${tone.bar} transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`text-xs font-medium tabular-nums text-end ${tone.text}`}>
              {count} · {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── ActivityFeed ────────────────────────────────────────────────── */
function ActivityFeed({ logs, isLoading }: { logs: AuditEntry[]; isLoading: boolean }) {
  const { t, locale } = useT();
  const [now] = useState(() => Date.now());

  function getInitials(name?: string, email?: string): string {
    const src = name || email || '?';
    return src.split(/[\s@]/).map((s: string) => s[0]).slice(0, 2).join('').toUpperCase();
  }

  function formatRelative(ts: string | number): string {
    const d = typeof ts === 'string' ? new Date(ts) : new Date(ts);
    const diffMs = now - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffH   = Math.floor(diffMs / 3_600_000);
    const diffD   = Math.floor(diffMs / 86_400_000);
    if (diffMin < 2) return t('time.justNow');
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (diffMin < 60) return rtf.format(-diffMin, 'minute');
    if (diffH < 24) return rtf.format(-diffH, 'hour');
    if (diffD === 1) return rtf.format(-1, 'day');
    return formatDate(d);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="h-7 w-7 rounded-full bg-surface-sidebar animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-surface-sidebar rounded animate-pulse w-3/4" />
              <div className="h-3 bg-surface-page rounded animate-pulse w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">{t('dashboard.noActivity')}</p>;
  }

  const ACTION_COLOR: Record<string, string> = {
    approved: 'text-[var(--green-700)]',
    rejected: 'text-[var(--red-700)]',
    deleted:  'text-[var(--red-700)]',
    created:  'text-primary-600 dark:text-primary-400',
    updated:  'text-primary-600 dark:text-primary-400',
  };

  return (
    <div className="space-y-4">
      {logs.map((log) => {
        const actor = log.actorName || log.actorEmail || t('common.system');
        const initials = getInitials(log.actorName, log.actorEmail);
        const actionColor = ACTION_COLOR[log.action?.toLowerCase()] ?? 'text-gray-600';
        return (
          <div key={log.id} className="flex gap-3 items-start">
            <div className="h-7 w-7 rounded-full bg-[var(--primary-100)] flex items-center justify-center text-[10px] font-semibold text-[var(--primary-700)] flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 leading-snug">
                <span className="font-semibold">{actor}</span>
                {' '}
                <span className={actionColor}>{log.action}</span>
                {log.module && (
                  <> <span className="text-gray-500">{log.module}</span></>
                )}
                {log.targetId && (
                  <> <span className="font-mono text-xs text-gray-500">{log.targetId}</span></>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{formatRelative(log.createdAt)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── PendingRequestsTable (admin only) ───────────────────────────── */
const typeKeys: Record<string, MessageKey> = {
  REFILL: 'requestType.REFILL',
  RETIRE: 'requestType.RETIRE',
  BUY_NEW: 'requestType.BUY_NEW',
  EXTEND_WARRANTY: 'requestType.EXTEND_WARRANTY',
};

const typeTones: Record<string, string> = {
  REFILL: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  RETIRE: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  BUY_NEW: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  EXTEND_WARRANTY: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
};

function PendingRequestsTable({
  requests,
  isLoading,
  orgSlug,
  locale,
  space,
  onApprove,
  onReject,
}: {
  requests: Request[];
  isLoading: boolean;
  orgSlug: string;
  locale: string;
  space: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const router = useRouter();
  const { t } = useT();
  const columns: ColumnDef<Request>[] = [
    {
      key: 'type',
      header: t('requests.type'),
      render: (r) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeTones[r.type] ?? 'bg-gray-100 text-gray-700'}`}>
          {typeKeys[r.type] ? t(typeKeys[r.type]) : r.type}
        </span>
      ),
    },
    {
      key: 'asset',
      header: t('col.asset'),
      render: (r) => (
        <span className="font-medium text-gray-900 text-sm">
          {r.assetName ?? r.inventoryItemName ?? '—'}
        </span>
      ),
    },
    {
      key: 'by',
      header: t('requests.submittedBy'),
      render: (r) => (
        <span className="text-sm text-gray-600">
          {r.createdByName ?? r.createdByEmail ?? r.createdBy}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) =>
        r.status === 'PENDING' ? (
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); onApprove(r.id); }}
              aria-label={t('common.approve')}
              className="h-7 w-7 rounded-md flex items-center justify-center text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors duration-150"
            >
              <CheckIcon />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onReject(r.id); }}
              aria-label={t('common.reject')}
              className="h-7 w-7 rounded-md flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors duration-150"
            >
              <XIcon />
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <DataTable
      data={requests}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('dashboard.noPendingRequests')}
      onRowClick={() => router.push(`/${locale}/${orgSlug}/${space}/requests/list`)}
      keyExtractor={(r) => r.id}
    />
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const { user } = useAuthStore();
  const { data, isLoading } = useDashboard();
  const { t, locale } = useT();

  const firstName = (user?.displayName ?? user?.email ?? 'there').split(/[\s@]/)[0];
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  const activeAssets       = data?.assets.filter((a) => a.status === 'Active')  ?? [];
  const _retiredAssets      = data?.assets.filter((a) => a.status === 'Retired') ?? [];
  const totalAssets        = data?.assets ?? [];
  const expiringWarranties = data?.warranties ?? [];
  const pendingRequests    = data?.requests ?? [];
  const auditLogs          = data?.auditLogs ?? [];

  async function handleDecision(requestId: string, action: 'approve' | 'reject') {
    try {
      await fetch(`/api/requests/${requestId}/${action}`, { method: 'POST' });
    } catch {
      // Silent fail — full handling in the Requests page
    }
  }

  const warrantyColumns: ColumnDef<Warranty>[] = [
    { key: 'assetId', header: t('col.asset'),     render: (w) => <span className="font-medium text-sm">{w.assetName ?? w.assetId}</span> },
    { key: 'vendor',  header: t('col.vendor'),    render: (w) => <span className="text-sm text-gray-600">{w.vendor}</span> },
    { key: 'endDate', header: t('col.expiry'),    render: (w) => <span className="text-red-600 dark:text-red-400 font-medium text-sm tabular-nums">{formatDate(w.endDate)}</span> },
    {
      key: 'days',
      header: t('col.remaining'),
      render: (w) => {
        const d = daysUntil(w.endDate);
        return (
          <span className={`font-semibold tabular-nums text-sm ${d < 7 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {d < 0 ? `${Math.abs(d)}${t('time.dayShort')} ${t('time.ago')}` : `${d}${t('time.dayShort')}`}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {t(getGreetingKey())}{locale === 'ar' ? '،' : ','} {firstName}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('dashboard.subtitle')}
          </p>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<TotalIcon />}
          iconBg="var(--primary-50)"
          iconColor="var(--primary-700)"
          label={t('dashboard.totalAssets')}
          value={isLoading ? <SkeletonValue /> : <p className="text-2xl font-bold text-gray-900 tabular-nums">{totalAssets.length}</p>}
          onClick={() => router.push(`/${locale}/${orgSlug}/${space}/usool/list`)}
        />
        <StatCard
          icon={<ActiveIcon />}
          iconBg="var(--green-50)"
          iconColor="var(--green-700)"
          label={t('dashboard.active')}
          value={isLoading ? <SkeletonValue /> : <p className="text-2xl font-bold text-gray-900 tabular-nums">{activeAssets.length}</p>}
          sub={!isLoading && totalAssets.length > 0 ? `${Math.round((activeAssets.length / totalAssets.length) * 100)}${t('dashboard.percentOfTotal')}` : undefined}
          onClick={() => router.push(`/${locale}/${orgSlug}/${space}/usool/list?status=Active`)}
        />
        <StatCard
          icon={<InboxIcon />}
          iconBg="var(--yellow-50)"
          iconColor="var(--yellow-700)"
          label={t('dashboard.pendingRequests')}
          value={isLoading ? <SkeletonValue /> : <p className="text-2xl font-bold text-gray-900 tabular-nums">{pendingRequests.length}</p>}
          sub={!isLoading && pendingRequests.length > 0 ? t('dashboard.needReview') : undefined}
          onClick={() => router.push(`/${locale}/${orgSlug}/${space}/requests/list?status=PENDING`)}
        />
        <StatCard
          icon={<WarningIcon />}
          iconBg="var(--yellow-50)"
          iconColor="var(--yellow-700)"
          label={t('dashboard.warrantiesExpiring')}
          value={
            isLoading ? <SkeletonValue /> : (
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {expiringWarranties.length}
                <span className="text-sm font-normal text-gray-500 ms-1">{t('dashboard.soon')}</span>
              </p>
            )
          }
          onClick={() => router.push(`/${locale}/${orgSlug}/${space}/warranties?expiring=30`)}
        />
      </div>

      {/* ── Middle row: asset breakdown + activity feed ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Asset breakdown — takes 3 of 5 columns */}
        <Card className="lg:col-span-3">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900">{t('dashboard.assetBreakdown')}</h2>
              <button
                onClick={() => router.push(`/${locale}/${orgSlug}/${space}/usool/list`)}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                {t('dashboard.viewAll')}              </button>
            </div>
            <AssetBreakdownBar assets={totalAssets} isLoading={isLoading} />
          </CardContent>
        </Card>

        {/* Recent activity — takes 2 of 5 columns */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900">{t('dashboard.recentActivity')}</h2>
              <button
                onClick={() => router.push(`/${locale}/${orgSlug}/${space}/audit-logs`)}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                {t('dashboard.viewAll')}              </button>
            </div>
            <ActivityFeed logs={auditLogs} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom row: expiring warranties + pending requests ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Expiring warranties — takes 2 of 5 columns */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">{t('dashboard.expiringWarranties')}</h2>
              <button
                onClick={() => router.push(`/${locale}/${orgSlug}/${space}/warranties`)}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                {t('dashboard.viewAll')}              </button>
            </div>
            <DataTable
              data={expiringWarranties.slice(0, 5)}
              columns={warrantyColumns}
              isLoading={isLoading}
              emptyMessage={t('dashboard.noWarranties')}
              keyExtractor={(w) => w.id}
            />
          </CardContent>
        </Card>

        {/* Pending requests (admin only) — takes 3 of 5 columns */}
        {isAdmin && (
          <Card className="lg:col-span-3">
            <CardContent className="p-0">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-semibold text-gray-900">{t('dashboard.pendingRequests')}</h2>
                  {!isLoading && pendingRequests.length > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-semibold tabular-nums">
                      {pendingRequests.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => router.push(`/${locale}/${orgSlug}/${space}/requests/list?status=PENDING`)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
                >
                  {t('dashboard.openQueue')}                </button>
              </div>
              <PendingRequestsTable
                requests={pendingRequests}
                isLoading={isLoading}
                orgSlug={orgSlug}
                locale={locale}
                space={space}
                onApprove={(id) => handleDecision(id, 'approve')}
                onReject={(id) => handleDecision(id, 'reject')}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
