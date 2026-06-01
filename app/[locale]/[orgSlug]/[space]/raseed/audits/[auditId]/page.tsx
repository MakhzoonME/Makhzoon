'use client';
import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStockAudit, useCompleteStockAudit } from '@/hooks/inventory';
import { useOrgSlug, useSpace, useT } from '@/hooks/ui';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/ui';
import { ArrowLeft, CheckCheck, CheckCircle2 } from 'lucide-react';
import { useOrgInfo } from '@/hooks/org';
import { StockAuditRow } from '@/components/inventory/stock-audits/StockAuditRow';
import { StockAuditReconcileDialog } from '@/components/inventory/stock-audits/StockAuditReconcileDialog';
import type { StockAuditAdjustment } from '@/types/stock-audit.types';

/* ── Scan icon ───────────────────────────────────────────────────── */
function ScanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="1" y="7" width="20" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M5 4V2M8 4V2M11 4V2M14 4V2M17 4V2M5 20v-2M8 20v-2M11 20v-2M14 20v-2M17 20v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/* ── Pending-only toggle ─────────────────────────────────────────── */
function PendingToggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="inline-flex items-center gap-2 text-xs text-gray-500 cursor-pointer"
    >
      <span>{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${on ? 'bg-primary-600' : 'bg-gray-200'}`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-[18px]' : 'translate-x-[3px]'}`}
        />
      </span>
    </button>
  );
}

export default function StockAuditDetailPage() {
  const { auditId } = useParams<{ auditId: string }>();
  const router  = useRouter();
  const orgSlug = useOrgSlug();
  const space   = useSpace();
  const { t, locale } = useT();
  const { data, isLoading } = useStockAudit(auditId);
  const complete = useCompleteStockAudit(auditId);
  const [search, setSearch]             = useState('');
  const [pendingOnly, setPendingOnly]   = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);

  const { data: orgInfo } = useOrgInfo();
  const auditsHref = `/${locale}/${orgSlug}/${space}/raseed/audits`;

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = data.items;
    if (pendingOnly) items = items.filter((i) => i.status === 'pending');
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (it) =>
        it.itemName.toLowerCase().includes(q) ||
        (it.itemSku ?? '').toLowerCase().includes(q) ||
        (it.itemCategory ?? '').toLowerCase().includes(q) ||
        (it.itemLocation ?? '').toLowerCase().includes(q),
    );
  }, [data, search, pendingOnly]);

  if (isLoading) return <LoadingSkeleton />;
  if (!data) return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-sm">
      {t('stockAudits.noAudits')}
    </div>
  );

  const { audit, items } = data;
  const completed = audit.status === 'completed';
  const pct = audit.totalItems
    ? Math.min(100, Math.round((audit.countedCount / audit.totalItems) * 100))
    : 0;

  const pending = filtered.filter((i) => i.status === 'pending');
  const counted = filtered.filter((i) => i.status === 'counted');

  function handleSubmitReconcile(adjustments: Record<string, StockAuditAdjustment>) {
    complete.mutate(
      { adjustments },
      {
        onSuccess: (res) => {
          setReconcileOpen(false);
          toast.success(
            t('stockAudits.completedToast') +
              (res.applied > 0
                ? ' · ' + t('stockAudits.appliedCount').replace('{count}', String(res.applied))
                : ''),
          );
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : t('stockAudits.completeFailed')),
      },
    );
  }

  return (
    <div>
      <PageHeader
        title={audit.title}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: space },
          { label: t('nav.inventory'),          href: `/${locale}/${orgSlug}/${space}/raseed/list` },
          { label: t('stockAudits.breadcrumb'), href: auditsHref },
          { label: audit.title },
        ]}
        actions={
          completed ? (
            <Button size="sm" className="cursor-pointer transition-colors duration-150"
              onClick={() => router.push(auditsHref)}>
              <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              <span className="ms-1">{t('stockAudits.backToAudits')}</span>
            </Button>
          ) : audit.pendingCount === 0 ? (
            <Button size="sm" className="cursor-pointer transition-colors duration-150"
              onClick={() => setReconcileOpen(true)} disabled={complete.isPending}>
              <CheckCheck aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              <span className="ms-1">{t('stockAudits.completeAndReconcile')}</span>
            </Button>
          ) : undefined
        }
      />

      {/* ── Progress card ─────────────────────────────────────────── */}
      <div className="bg-surface-card rounded-xl border border-border p-5 mb-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-xl mt-0.5"
            style={{ width: 44, height: 44, background: 'color-mix(in srgb, var(--mod-raseed) 14%, var(--surface-card))', color: 'var(--mod-raseed)' }}
          >
            <ScanIcon />
          </div>

          {/* Stats + bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <span>
                  <strong className="text-gray-900 tabular-nums">{audit.totalItems}</strong>{' '}
                  <span className="text-gray-400">{t('stockAudits.totalLabel')}</span>
                </span>
                <span>
                  <strong className="tabular-nums" style={{ color: 'var(--mod-raseed)' }}>{audit.countedCount}</strong>{' '}
                  <span className="text-gray-400">{t('stockAudits.countedLabel')}</span>
                </span>
                <span>
                  <strong className="text-gray-400 tabular-nums">{audit.pendingCount}</strong>{' '}
                  <span className="text-gray-400">{t('stockAudits.pendingLabel')}</span>
                </span>
                {audit.varianceTotal !== 0 && (
                  <span>
                    <strong className={`tabular-nums ${audit.varianceTotal < 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {audit.varianceTotal > 0 ? '+' : ''}{audit.varianceTotal}
                    </strong>{' '}
                    <span className="text-gray-400">{t('stockAudits.varianceLabel')}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700 tabular-nums">{pct}%</span>
                {!completed && (
                  <PendingToggle
                    on={pendingOnly}
                    onChange={setPendingOnly}
                    label={t('stockAudits.pendingOnly')}
                  />
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-surface-page rounded-full overflow-hidden border border-border">
              <div
                className="h-2 rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%`, background: 'var(--mod-raseed)' }}
              />
            </div>

            {!completed && audit.pendingCount === 0 && (
              <p className="mt-2 text-xs text-emerald-700">{t('stockAudits.allCountedHint')}</p>
            )}
            {completed && (
              <div className="mt-3 flex items-center justify-between gap-2 text-sm flex-wrap">
                <span className="inline-flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                  {t('audits.statusCompleted')}
                </span>
                <Button size="sm" variant="outline" className="cursor-pointer transition-colors duration-150"
                  onClick={() => router.push(auditsHref)}>
                  <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                  <span className="ms-1">{t('stockAudits.backToAudits')}</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('stockAudits.searchItems')}
          className="max-w-xs"
        />
      </div>

      {/* Pending items */}
      {pending.length > 0 && (
        <div className="bg-surface-card rounded-xl border border-border mb-4 overflow-hidden">
          <div className="px-5 py-3 border-b border-border text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('stockAudits.pendingHeading').replace('{count}', String(pending.length))}
          </div>
          {pending.map((it) => (
            <StockAuditRow key={it.id} item={it} auditId={auditId} completed={completed} />
          ))}
        </div>
      )}

      {/* Counted items — hidden when pendingOnly is on */}
      {!pendingOnly && counted.length > 0 && (
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('stockAudits.countedHeading').replace('{count}', String(counted.length))}
          </div>
          {counted.map((it) => (
            <StockAuditRow key={it.id} item={it} auditId={auditId} completed={completed} />
          ))}
        </div>
      )}

      <StockAuditReconcileDialog
        open={reconcileOpen}
        onOpenChange={setReconcileOpen}
        items={items}
        submitting={complete.isPending}
        onSubmit={handleSubmitReconcile}
      />
    </div>
  );
}
