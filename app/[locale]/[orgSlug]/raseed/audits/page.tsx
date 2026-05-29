'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug, useT } from '@/hooks/ui';
import { useStockAudits } from '@/hooks/inventory';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import type { StockAudit } from '@/types/stock-audit.types';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/date';
import { Plus, Clock, ClipboardList, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { MessageKey } from '@/locales/messages';

const STATUS_MAP: Record<string, { labelKey: MessageKey; class: string; icon: React.ReactNode }> = {
  draft: { labelKey: 'audits.statusDraft', class: 'bg-surface-page text-gray-600', icon: <Clock className="h-4 w-4" strokeWidth={1.75} /> },
  in_progress: { labelKey: 'audits.statusInProgress', class: 'bg-[var(--yellow-100)] text-[var(--yellow-700)] border border-[var(--yellow-100)]', icon: <ClipboardList className="h-4 w-4" strokeWidth={1.75} /> },
  completed: { labelKey: 'audits.statusCompleted', class: 'bg-[var(--green-100)] text-[var(--green-700)] border border-[var(--green-100)]', icon: <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} /> },
};

export default function StockAuditsPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { t, locale } = useT();
  const { user } = useAuthStore();
  const { data, isLoading } = useStockAudits();
  const [search, setSearch] = useState('');

  const audits: StockAudit[] = data?.audits ?? [];
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  const filtered = search.trim()
    ? audits.filter((a) =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        (a.notes ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : audits;

  if (isLoading) return <LoadingSkeleton rows={4} />;

  return (
    <div>
      <PageHeader
        title={t('stockAudits.title')}
        description={t('stockAudits.subtitle')}
        breadcrumb={[
          { label: t('nav.inventory'), href: `/${locale}/${orgSlug}/raseed` },
          { label: t('stockAudits.breadcrumb'), href: `/${locale}/${orgSlug}/raseed/audits` },
        ]}
        actions={isAdmin ? (
          <Button size="sm" onClick={() => router.push(`/${locale}/${orgSlug}/raseed/audits/new`)}>
            <Plus className="h-4 w-4" strokeWidth={1.75} /><span className="ms-1">{t('stockAudits.startAudit')}</span>
          </Button>
        ) : undefined}
      />

      <div className="mb-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('stockAudits.searchAudits')}
          className="max-w-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <ClipboardList className="h-10 w-10" strokeWidth={1.75} />
          <p className="mt-3 text-sm text-center">{t('stockAudits.noAudits')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((audit) => {
            const s = STATUS_MAP[audit.status] ?? STATUS_MAP.in_progress;
            return (
              <div
                key={audit.id}
                className="bg-surface-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary-300 transition-colors"
                onClick={() => router.push(`/${locale}/${orgSlug}/raseed/audits/${audit.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{audit.title}</h3>
                    {audit.notes && (
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-xs text-gray-500 truncate mb-2">{audit.notes}</p>
                          </TooltipTrigger>
                          <TooltipContent>{audit.notes}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span>{formatDate(audit.createdAt)}</span>
                      {audit.completedAt && (
                        <span>· {t('audits.completedAt').replace('{date}', formatDate(audit.completedAt))}</span>
                      )}
                      <span>· {t('audits.itemCount').replace('{count}', String(audit.totalItems))}</span>
                      <span>· {t('stockAudits.varianceTotal').replace('{value}', String(audit.varianceTotal))}</span>
                    </div>
                  </div>
                  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', s.class)}>
                    {s.icon} {t(s.labelKey)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
