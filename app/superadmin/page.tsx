'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAllOrgsUsage } from '@/hooks/useAllOrgsUsage';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils/date';
import { Plus, ArrowRight, Search, Edit2, CreditCard, Settings } from 'lucide-react';
import { useTransferMode } from '@/hooks/useTransferMode';
import { useDebounce } from '@/hooks/useDebounce';
import { ORG_CATEGORIES, type OrgWithUsage } from '@/types';

/* ── SVG icons ───────────────────────────────────────────────────── */
function BuildingSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="3" y="2" width="12" height="14" rx="1.2" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M7 6h1M10 6h1M7 9h1M10 9h1M7 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function UsersSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="7" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 15c0-2.761 2.239-4.5 5-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="13" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M16 15c0-2.209-1.343-3.5-3-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function BoxSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M15.5 5.5L9 2 2.5 5.5v7L9 16l6.5-3.5v-7z" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M2.5 5.5l6.5 4 6.5-4M9 9.5V16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function TrendSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M2 13l3.5-4.5 3 3 4-6 3 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function daysUntil(d: Date | string): number {
  const target = typeof d === 'string' ? new Date(d) : d;
  return Math.ceil((target.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

/* ── Stat card ───────────────────────────────────────────────────── */
function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg flex-shrink-0" style={{ background: iconBg, color: iconColor }}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{label}</p>
            {value}
            {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminPage() {
  const router = useRouter();
  const { enterTransferMode } = useTransferMode();

  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState<string>('');
  const search = useDebounce(searchInput, 250);

  const { data: rows = [], isLoading } = useAllOrgsUsage({
    search: search || undefined,
    category: category || undefined,
  });

  // Derived stats
  const allRows = rows as OrgWithUsage[];
  const activeOrgs = allRows.filter((r) => r.subscription?.status === 'ACTIVE').length;
  const totalAssets = allRows.reduce((s, r) => s + (r.usage?.assets ?? 0), 0);

  const columns: ColumnDef<OrgWithUsage>[] = [
    {
      key: 'name',
      header: 'Organization',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex-shrink-0">
            {r.organization.name.split(' ').map((s: string) => s[0]).slice(0, 2).join('')}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{r.organization.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{r.organization.subdomain}.makhzoon.me</p>
          </div>
        </div>
      ),
    },
    {
      key: 'subdomain',
      header: 'Category',
      render: (r) => r.organization.category ?? <span className="text-gray-400 dark:text-gray-500">—</span>,
    },
    {
      key: 'subscription',
      header: 'Subscription',
      render: (r) => {
        if (!r.subscription) return <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>;
        const d = daysUntil(r.subscription.endDate);
        const tone = d < 0 ? 'text-red-600 dark:text-red-400' : d <= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400';
        return (
          <div className="space-y-1">
            <StatusBadge status={r.subscription.status} />
            <p className={`text-[11px] ${tone}`}>
              {d < 0 ? `Expired ${Math.abs(d)}d ago` : `${d}d remaining`}
            </p>
          </div>
        );
      },
    },
    {
      key: 'created',
      header: 'Since',
      render: (r) => <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">{formatDate(r.organization.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button
            size="sm"
            variant="outline"
            className="text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            onClick={(e) => {
              e.stopPropagation();
              enterTransferMode(r.organization.id, r.organization.name);
            }}
          >
            <ArrowRight className="h-3.5 w-3.5 mr-1" /> Enter
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/superadmin/organizations/${r.organization.id}/subscription`);
            }}
            title="Subscription"
          >
            <CreditCard className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/superadmin/organizations/${r.organization.id}/configuration`);
            }}
            title="Configuration"
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/superadmin/organizations/${r.organization.id}/edit`);
            }}
            title="Edit"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Organizations"
        description={`${rows.length} workspaces on the platform`}
        actions={
          <Button size="sm" onClick={() => router.push('/superadmin/organizations/new')}>
            <Plus className="h-4 w-4 mr-1" />
            Create Organization
          </Button>
        }
      />

      {/* ── Stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<BuildingSVG />}
          iconBg="var(--primary-50)"
          iconColor="var(--primary-600)"
          label="Organizations"
          value={
            isLoading
              ? <div className="h-7 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              : <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{rows.length}</p>
          }
          sub={!isLoading && activeOrgs > 0 ? `${activeOrgs} active` : undefined}
        />
        <StatCard
          icon={<UsersSVG />}
          iconBg="var(--green-50)"
          iconColor="var(--green-600)"
          label="Active subs"
          value={
            isLoading
              ? <div className="h-7 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              : <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{activeOrgs}</p>
          }
        />
        <StatCard
          icon={<BoxSVG />}
          iconBg="var(--yellow-50)"
          iconColor="var(--yellow-600)"
          label="Total assets"
          value={
            isLoading
              ? <div className="h-7 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              : <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{totalAssets.toLocaleString()}</p>
          }
        />
        <StatCard
          icon={<TrendSVG />}
          iconBg="var(--primary-50)"
          iconColor="var(--primary-600)"
          label="Platform growth"
          value={
            isLoading
              ? <div className="h-7 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              : <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{rows.length}</p>
          }
          sub="total workspaces"
        />
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, subdomain, email…"
            className="pl-8"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
        >
          <option value="">All categories</option>
          {ORG_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {(searchInput || category) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearchInput('');
              setCategory('');
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <DataTable
          data={rows}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No organizations match the filters."
          keyExtractor={(r) => r.organization.id}
        />
      </div>
    </div>
  );
}
