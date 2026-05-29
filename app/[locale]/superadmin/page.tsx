'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAllOrgsUsage } from '@/hooks/org';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils/date';
import { Plus, ArrowRight, Search, Edit2, CreditCard } from 'lucide-react';
import { useTransferMode } from '@/hooks/ui';
import { useDebounce } from '@/hooks/ui';
import { ORG_CATEGORIES, type OrgWithUsage } from '@/types';
import { useT } from '@/hooks/ui';

interface TeamMember {
  id: string;
  displayName: string;
  email: string;
}

function daysUntil(d: Date | string): number {
  const target = typeof d === 'string' ? new Date(d) : d;
  return Math.ceil((target.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function syncFiltersToUrl(pathname: string, params: Record<string, string>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return `${pathname}${qs.toString() ? '?' + qs.toString() : ''}`;
}

function sortOrgs(rows: OrgWithUsage[], sortBy: string, sortDir: 'asc' | 'desc'): OrgWithUsage[] {
  const sorted = [...rows].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';
    switch (sortBy) {
      case 'name':
        aVal = a.organization.name.toLowerCase();
        bVal = b.organization.name.toLowerCase();
        break;
      case 'subdomain':
        aVal = a.organization.subdomain.toLowerCase();
        bVal = b.organization.subdomain.toLowerCase();
        break;
      case 'category':
        aVal = (a.organization.category ?? '').toLowerCase();
        bVal = (b.organization.category ?? '').toLowerCase();
        break;
      case 'subscription':
        aVal = a.subscription?.status ?? '';
        bVal = b.subscription?.status ?? '';
        break;
      case 'created':
        aVal = new Date(a.organization.createdAt).getTime();
        bVal = new Date(b.organization.createdAt).getTime();
        break;
      default:
        aVal = new Date(a.organization.createdAt).getTime();
        bVal = new Date(b.organization.createdAt).getTime();
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
  });
  return sorted;
}

export default function SuperAdminPage() {
  const { t, locale } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { enterTransferMode } = useTransferMode();

  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? '';
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 10;
  const sortBy = searchParams.get('sortBy') ?? 'created';
  const sortDir = (searchParams.get('sortDir') === 'asc' ? 'asc' : searchParams.get('sortDir') === 'none' ? 'none' : 'desc') as 'asc' | 'desc' | 'none';

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearchInput = useDebounce(searchInput, 250);

  const { data: allRows = [], isLoading } = useAllOrgsUsage({
    search: search || undefined,
    category: category || undefined,
  });

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ['superadmin-team'],
    queryFn: async () => {
      const res = await fetch('/api/superadmin/team');
      if (!res.ok) throw new Error('Failed to load team');
      return res.json();
    },
    staleTime: 60_000,
  });

  const memberById = Object.fromEntries(teamMembers.map((m) => [m.id, m.displayName]));

  const sorted = sortDir === 'none' ? allRows : sortOrgs(allRows, sortBy, sortDir);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const updateUrl = useCallback((params: Record<string, string>) => {
    const url = syncFiltersToUrl(pathname, params);
    router.replace(url, { scroll: false });
  }, [pathname, router]);

  useEffect(() => {
    if (debouncedSearchInput !== search) {
      updateUrl({
        search: debouncedSearchInput,
        category,
        page: '1',
        pageSize: String(pageSize),
        sortBy,
        sortDir,
      });
    }
  }, [debouncedSearchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  function syncAllToUrl(next: Partial<Record<'search' | 'category' | 'page' | 'pageSize' | 'sortBy' | 'sortDir', string>>) {
    updateUrl({
      search: next.search ?? search,
      category: next.category ?? category,
      page: next.page ?? String(page),
      pageSize: next.pageSize ?? String(pageSize),
      sortBy: next.sortBy ?? sortBy,
      sortDir: next.sortDir ?? sortDir,
    });
  }

  function handleSortChange(nextSortBy: string, nextSortDir: 'asc' | 'desc' | 'none') {
    syncAllToUrl({ sortBy: nextSortBy, sortDir: nextSortDir === 'none' ? '' : nextSortDir });
  }

  const columns: ColumnDef<OrgWithUsage>[] = [
    {
      key: 'name',
      header: t('orgs.name'),
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.organization.name}</p>
          <p className="text-xs text-gray-500">{r.organization.contactEmail}</p>
        </div>
      ),
    },
    {
      key: 'subdomain',
      header: t('orgs.workspaceId'),
      sortable: true,
      render: (r) => (
        <span className="font-mono text-xs bg-surface-page px-2 py-0.5 rounded">{r.organization.subdomain}</span>
      ),
    },
    {
      key: 'category',
      header: t('orgs.category'),
      sortable: true,
      render: (r) => r.organization.category ?? <span className="text-gray-400">—</span>,
    },
    {
      key: 'assignedMember',
      header: t('settings.accountManager'),
      render: (r) => {
        const name = r.organization.assignedMemberId ? memberById[r.organization.assignedMemberId] : null;
        if (!name) return <span className="text-gray-400 text-xs">—</span>;
        return (
          <div>
            <p className="text-sm font-medium text-gray-800">{name}</p>
          </div>
        );
      },
    },
    {
      key: 'subscription',
      header: t('orgs.subscription'),
      sortable: true,
      render: (r) => {
        if (!r.subscription) return <span className="text-gray-400 text-sm">—</span>;
        const d = daysUntil(r.subscription.endDate);
        const tone = d < 0 ? 'text-red-600' : d <= 30 ? 'text-amber-600' : 'text-gray-500';
        return (
          <div className="space-y-1">
            <StatusBadge status={r.subscription.status} />
            <p className={`text-[11px] ${tone}`}>
              {d < 0
                ? t('orgs.expiredAgo').replace('{days}', String(Math.abs(d)))
                : t('orgs.daysRemaining').replace('{days}', String(d))}
            </p>
          </div>
        );
      },
    },
    {
      key: 'created',
      header: t('orgs.created'),
      sortable: true,
      render: (r) => formatDate(r.organization.createdAt),
    },
    {
      key: 'actions',
      header: t('orgs.actions'),
      render: (r) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              enterTransferMode(r.organization.id, r.organization.name);
            }}
          >
            <ArrowRight className="h-3.5 w-3.5 me-1" /> {t('orgs.enter')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${locale}/superadmin/organizations/${r.organization.id}/subscription`);
            }}
            title={t('nav.subscription')}
          >
            <CreditCard className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${locale}/superadmin/organizations/${r.organization.id}/edit`);
            }}
            title={t('common.edit')}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('nav.organizations')}
        actions={
          <Button size="sm" onClick={() => router.push(`/${locale}/superadmin/organizations/new`)}>
            <Plus className="h-4 w-4 me-1" />
            {t('orgs.createOrg')}
          </Button>
        }
      />

      <div className="bg-surface-card border border-border rounded-lg p-3 flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('orgs.searchPlaceholder')}
            className="ps-8"
          />
        </div>
        <select
          value={category}
          onChange={(e) => syncAllToUrl({ category: e.target.value, page: '1' })}
          className="h-9 rounded-md border border-border bg-surface-card px-3 text-[14px] text-gray-700 focus:outline-none focus:ring-[3px] focus:ring-primary-500/20 focus:border-primary-600"
        >
          <option value="">{t('orgs.allCategories')}</option>
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
              syncAllToUrl({ search: '', category: '', page: '1' });
            }}
          >
            {t('orgs.clear')}
          </Button>
        )}
      </div>

      <div className="bg-surface-card rounded-lg border border-border">
        <DataTable
          data={paginated}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('orgs.noMatch')}
          keyExtractor={(r) => r.organization.id}
          pagination={{
            page: safePage,
            pageSize,
            total,
            totalPages,
            onPageChange: (p) => syncAllToUrl({ page: String(p) }),
            onPageSizeChange: (s) => syncAllToUrl({ pageSize: String(s), page: '1' }),
            onSortChange: handleSortChange,
            currentSortBy: sortBy,
            currentSortDir: sortDir,
          }}
        />
      </div>
    </div>
  );
}
