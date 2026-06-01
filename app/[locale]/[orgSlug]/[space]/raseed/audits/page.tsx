'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug, useSpace, useT } from '@/hooks/ui';
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
import { useOrgInfo } from '@/hooks/org';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { MessageKey } from '@/locales/messages';

/* ── Scan icon ───────────────────────────────────────────────────── */
function ScanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="1" y="7" width="20" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M5 4V2M8 4V2M11 4V2M14 4V2M17 4V2M5 20v-2M8 20v-2M11 20v-2M14 20v-2M17 20v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const STATUS_MAP: Record<string, { labelKey: MessageKey; class: string; icon: React.ReactNode }> = {
  draft:       { labelKey: 'audits.statusDraft',      class: 'bg-surface-page text-gray-600 border border-border',                              icon: <Clock       aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} /> },
  in_progress: { labelKey: 'audits.statusInProgress', class: 'bg-[var(--yellow-100)] text-[var(--yellow-700)] border border-[var(--yellow-100)]', icon: <ClipboardList aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} /> },
  completed:   { labelKey: 'audits.statusCompleted',  class: 'bg-[var(--green-100)] text-[var(--green-700)] border border-[var(--green-100)]',    icon: <CheckCircle2  aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} /> },
};

function AuditProgressBar({ counted, total }: { counted: number; total: number }) {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((counted / total) * 100));
  return (
    <div className="mt-3 space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{counted} / {total}</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 bg-surface-page rounded-full overflow-hidden border border-border">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: 'var(--mod-raseed)' }}
        />
      </div>
    </div>
  );
}

export default function StockAuditsPage() {
  const router  = useRouter();
  const orgSlug = useOrgSlug();
  const space   = useSpace();
  const { t, locale } = useT();
  const { user } = useAuthStore();
  const { data: orgInfo } = useOrgInfo();
  const { data, isLoading } = useStockAudits();
  const [search, setSearch] = useState('');

  const audits: StockAudit[] = data?.audits ?? [];
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';
  const base    = `/${locale}/${orgSlug}/${space}/raseed/audits`;

  const filtered = search.trim()
    ? audits.filter((a) =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        (a.notes ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : audits;

  const activeAudit = filtered.find((a) => a.status === 'in_progress');
  const restAudits  = filtered.filter((a) => a !== activeAudit);

  if (isLoading) return <LoadingSkeleton rows={4} />;

  return (
    <div>
      <PageHeader
        title={t('stockAudits.title')}
        description={t('stockAudits.subtitle')}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: space },
          { label: t('nav.inventory'), href: `/${locale}/${orgSlug}/${space}/raseed/list` },
          { label: t('stockAudits.breadcrumb'), href: base },
        ]}
        actions={isAdmin ? (
          <Button size="sm"
            onClick={() => router.push(`${base}/new`)}
            className="cursor-pointer transition-colors duration-150"
            style={{ background: 'var(--mod-raseed)' }}
          >
            <Plus aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            <span className="ms-1">{t('stockAudits.startAudit')}</span>
          </Button>
        ) : undefined}
      />

      {/* Search */}
      <div className="mb-5">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('stockAudits.searchAudits')}
          className="max-w-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <ClipboardList aria-hidden className="h-10 w-10" strokeWidth={1.75} />
          <p className="mt-3 text-sm text-center">{t('stockAudits.noAudits')}</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Featured in-progress audit ─────────────────────────── */}
          {activeAudit && (
            <div
              className="bg-surface-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary-300 transition-colors duration-150"
              onClick={() => router.push(`${base}/${activeAudit.id}`)}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-xl mt-0.5"
                  style={{ width: 44, height: 44, background: 'color-mix(in srgb, var(--mod-raseed) 14%, var(--surface-card))', color: 'var(--mod-raseed)' }}
                >
                  <ScanIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{activeAudit.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t('audits.itemCount').replace('{count}', String(activeAudit.totalItems))} ·{' '}
                        {formatDate(activeAudit.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', STATUS_MAP.in_progress.class)}>
                        {STATUS_MAP.in_progress.icon} {t(STATUS_MAP.in_progress.labelKey)}
                      </span>
                      <Button size="sm"
                        style={{ background: 'var(--mod-raseed)' }}
                        className="cursor-pointer transition-colors duration-150"
                        onClick={(e) => { e.stopPropagation(); router.push(`${base}/${activeAudit.id}`); }}
                      >
                        {t('stockAudits.continueAudit')}
                      </Button>
                    </div>
                  </div>
                  <AuditProgressBar counted={activeAudit.countedCount} total={activeAudit.totalItems} />
                </div>
              </div>
            </div>
          )}

          {/* ── Rest of audits ─────────────────────────────────────── */}
          {restAudits.map((audit) => {
            const s = STATUS_MAP[audit.status] ?? STATUS_MAP.in_progress;
            return (
              <div
                key={audit.id}
                className="bg-surface-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary-300 transition-colors duration-150"
                onClick={() => router.push(`${base}/${audit.id}`)}
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
                      <span className="tabular-nums font-mono">{formatDate(audit.createdAt)}</span>
                      {audit.completedAt && (
                        <span>· {t('audits.completedAt').replace('{date}', formatDate(audit.completedAt))}</span>
                      )}
                      <span>· {t('audits.itemCount').replace('{count}', String(audit.totalItems))}</span>
                      {audit.varianceTotal !== 0 && (
                        <span className={audit.varianceTotal < 0 ? 'text-red-600 font-medium' : 'text-green-700 font-medium'}>
                          · {audit.varianceTotal > 0 ? '+' : ''}{audit.varianceTotal}
                        </span>
                      )}
                    </div>
                    {audit.status !== 'completed' && (
                      <AuditProgressBar counted={audit.countedCount} total={audit.totalItems} />
                    )}
                  </div>
                  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0', s.class)}>
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
