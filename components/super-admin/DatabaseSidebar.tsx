'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface TableInfo {
  name: string;
  rowEstimate: number;
}

export function DatabaseSidebar() {
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();
  const [filter, setFilter] = useState('');

  const activeTable = useMemo(() => {
    const m = pathname.match(/\/superadmin\/database\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }, [pathname]);

  const { data, isLoading } = useQuery<{ tables: TableInfo[] }>({
    queryKey: ['superadmin-db-tables'],
    queryFn: async () => {
      const res = await fetch('/api/superadmin/database/tables');
      if (!res.ok) throw new Error('Failed to load tables');
      return res.json();
    },
    staleTime: 60_000,
  });

  const tables = data?.tables ?? [];
  const filtered = filter.trim()
    ? tables.filter((t) => t.name.toLowerCase().includes(filter.trim().toLowerCase()))
    : tables;

  return (
    <aside className="w-56 shrink-0 border-e border-border bg-surface-card rounded-lg overflow-hidden flex flex-col self-start sticky top-[72px] max-h-[calc(100vh-96px)]">
      <div className="p-2.5 border-b border-border">
        <div className="relative">
          <Search className="absolute start-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter tables…"
            className="w-full h-8 ps-7 pe-2 text-xs rounded-md border border-border bg-surface-page focus:outline-none focus:ring-1 focus:ring-primary-400"
          />
        </div>
        <p className="mt-1.5 text-[10px] text-gray-400 px-0.5">
          {isLoading ? 'Loading…' : `${filtered.length} table${filtered.length === 1 ? '' : 's'}`}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {filtered.map((t) => {
          const active = t.name === activeTable;
          return (
            <Link
              key={t.name}
              href={`/${locale}/superadmin/database/${t.name}`}
              title={`${t.name} — ~${t.rowEstimate} rows`}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                active
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-surface-page hover:text-gray-900',
              )}
            >
              <Table2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="truncate font-mono">{t.name}</span>
            </Link>
          );
        })}
        {!isLoading && filtered.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-gray-400">No tables match.</p>
        )}
      </nav>
    </aside>
  );
}
