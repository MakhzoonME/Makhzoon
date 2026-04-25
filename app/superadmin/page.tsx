'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAllOrgsUsage } from '@/hooks/useAllOrgsUsage';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils/date';
import { Plus, ArrowRight, Search, Edit2, CreditCard } from 'lucide-react';
import { useTransferMode } from '@/hooks/useTransferMode';
import { useDebounce } from '@/hooks/useDebounce';
import { ORG_CATEGORIES, type OrgWithUsage } from '@/types';

function daysUntil(d: Date | string): number {
  const target = typeof d === 'string' ? new Date(d) : d;
  return Math.ceil((target.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
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

  const columns: ColumnDef<OrgWithUsage>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.organization.name}</p>
          <p className="text-xs text-gray-500">{r.organization.contactEmail}</p>
        </div>
      ),
    },
    {
      key: 'subdomain',
      header: 'Subdomain',
      render: (r) => (
        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.organization.subdomain}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (r) => r.organization.category ?? <span className="text-gray-400">—</span>,
    },
    {
      key: 'subscription',
      header: 'Subscription',
      render: (r) => {
        if (!r.subscription) return <span className="text-gray-400 text-sm">—</span>;
        const d = daysUntil(r.subscription.endDate);
        const tone = d < 0 ? 'text-red-600' : d <= 30 ? 'text-amber-600' : 'text-gray-500';
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
      header: 'Created',
      render: (r) => formatDate(r.organization.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
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
    <div>
      <PageHeader
        title="Organizations"
        actions={
          <Button size="sm" onClick={() => router.push('/superadmin/organizations/new')}>
            <Plus className="h-4 w-4 mr-1" />
            Create Organization
          </Button>
        }
      />

      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap gap-2 mb-4">
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
          className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
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

      <div className="bg-white rounded-lg border border-gray-200">
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
