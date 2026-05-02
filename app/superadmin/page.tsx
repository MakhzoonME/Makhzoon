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
import { Plus, ArrowRight, Search, Edit2, CreditCard, Settings } from 'lucide-react';
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
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { enterTransferMode } = useTransferMode();

  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [page, setPage] = useState(searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1);
  const [pageSize, setPageSize] = useState(searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 10);
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') ?? 'created');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc');

  const search = useDebounce(searchInput, 250);

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

  const sorted = sortOrgs(allRows, sortBy, sortDir);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const updateUrl = useCallback((params: Record<string, string>) => {
    const url = syncFiltersToUrl(pathname, params);
    router.replace(url, { scroll: false });
  }, [pathname, router]);

  useEffect(() => {
    const urlSearch = searchParams.get('search') ?? '';
    const urlCategory = searchParams.get('category') ?? '';
    const urlPage = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const urlPageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 10;
    const urlSortBy = searchParams.get('sortBy') ?? 'created';
    const urlSortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

    if (urlSearch !== searchInput) setSearchInput(urlSearch);
    if (urlCategory !== category) setCategory(urlCategory);
    if (urlPage !== page) setPage(urlPage);
    if (urlPageSize !== pageSize) setPageSize(urlPageSize);
    if (urlSortBy !== sortBy) setSortBy(urlSortBy);
    if (urlSortDir !== sortDir) setSortDir(urlSortDir);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  function syncAllToUrl(next: Partial<Record<'search' | 'category' | 'page' | 'pageSize' | 'sortBy' | 'sortDir', string>>) {
    updateUrl({
      search: next.search ?? searchInput,
      category: next.category ?? category,
      page: next.page ?? String(page),
      pageSize: next.pageSize ?? String(pageSize),
      sortBy: next.sortBy ?? sortBy,
      sortDir: next.sortDir ?? sortDir,
    });
  }

  function handleSortChange(nextSortBy: string, nextSortDir: 'asc' | 'desc') {
    setSortBy(nextSortBy);
    setSortDir(nextSortDir);
    syncAllToUrl({ sortBy: nextSortBy, sortDir: nextSortDir });
  }

  const columns: ColumnDef<OrgWithUsage>[] = [
    {
      key: 'name',
      header: t('orgs.name'),
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{r.organization.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-300">{r.organization.contactEmail}</p>
        </div>
      ),
    },
    {
      key: 'subdomain',
      header: t('orgs.workspaceId'),
      sortable: true,
      render: (r) => (
        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.organization.subdomain}</span>
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
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{name}</p>
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
            <ArrowRight className="h-3.5 w-3.5 mr-1" /> {t('orgs.enter')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/superadmin/organizations/${r.organization.id}/subscription`);
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
              router.push(`/superadmin/organizations/${r.organization.id}/configuration`);
            }}
            title={t('nav.configuration')}
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
          <Button size="sm" onClick={() => router.push('/superadmin/organizations/new')}>
            <Plus className="h-4 w-4 mr-1" />
            {t('orgs.createOrg')}
          </Button>
        }
      />

      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(1); syncAllToUrl({ search: e.target.value, page: '1' }); }}
            placeholder={t('orgs.searchPlaceholder')}
            className="pl-8"
          />
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); syncAllToUrl({ category: e.target.value, page: '1' }); }}
          className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
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
              setCategory('');
              setPage(1);
              syncAllToUrl({ search: '', category: '', page: '1' });
            }}
          >
            {t('orgs.clear')}
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
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
            onPageChange: (p) => { setPage(p); syncAllToUrl({ page: String(p) }); },
            onPageSizeChange: (s) => { setPageSize(s); setPage(1); syncAllToUrl({ pageSize: String(s), page: '1' }); },
            onSortChange: handleSortChange,
            currentSortBy: sortBy,
            currentSortDir: sortDir,
          }}
        />
      </div>
    </div>
  );
}
