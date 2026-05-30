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
import { StockAuditRow } from '@/components/inventory/stock-audits/StockAuditRow';
import { StockAuditReconcileDialog } from '@/components/inventory/stock-audits/StockAuditReconcileDialog';
import type { StockAuditAdjustment } from '@/types/stock-audit.types';

export default function StockAuditDetailPage() {
  const { auditId } = useParams<{ auditId: string }>();
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const { t, locale } = useT();
  const { data, isLoading } = useStockAudit(auditId);
  const complete = useCompleteStockAudit(auditId);
  const [search, setSearch] = useState('');
  const [reconcileOpen, setReconcileOpen] = useState(false);

  const auditsHref = `/${locale}/${orgSlug}/${space}/raseed/audits`;

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.items;
    const q = search.toLowerCase();
    return data.items.filter(
      (it) =>
        it.itemName.toLowerCase().includes(q) ||
        (it.itemSku ?? '').toLowerCase().includes(q) ||
        (it.itemCategory ?? '').toLowerCase().includes(q) ||
        (it.itemLocation ?? '').toLowerCase().includes(q),
    );
  }, [data, search]);

  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <div className="p-6 text-gray-500">Audit not found.</div>;

  const { audit, items } = data;
  const completed = audit.status === 'completed';
  const pct = audit.totalItems
    ? Math.round((audit.countedCount / audit.totalItems) * 100)
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
          { label: t('nav.inventory'), href: `/${locale}/${orgSlug}/${space}/raseed` },
          { label: t('stockAudits.breadcrumb'), href: auditsHref },
          { label: audit.title, href: `${auditsHref}/${auditId}` },
        ]}
        actions={
          completed ? (
            <Button size="sm" onClick={() => router.push(auditsHref)}>
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              <span className="ms-1">{t('stockAudits.backToAudits')}</span>
            </Button>
          ) : audit.pendingCount === 0 ? (
            <Button size="sm" onClick={() => setReconcileOpen(true)} disabled={complete.isPending}>
              <CheckCheck className="h-4 w-4" strokeWidth={1.75} />
              <span className="ms-1">{t('stockAudits.completeAndReconcile')}</span>
            </Button>
          ) : undefined
        }
      />

      {/* Progress block */}
      <div className="bg-surface-card rounded-lg border border-border p-5 mb-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-6 text-sm flex-wrap">
            <span>
              <strong className="text-gray-900">{audit.totalItems}</strong>{' '}
              <span className="text-gray-400">{t('stockAudits.totalLabel')}</span>
            </span>
            <span>
              <strong className="text-emerald-600">{audit.countedCount}</strong>{' '}
              <span className="text-gray-400">{t('stockAudits.countedLabel')}</span>
            </span>
            <span>
              <strong className="text-gray-400">{audit.pendingCount}</strong>{' '}
              <span className="text-gray-400">{t('stockAudits.pendingLabel')}</span>
            </span>
            <span>
              <strong className="text-amber-600">{audit.varianceTotal}</strong>{' '}
              <span className="text-gray-400">
                {t('stockAudits.varianceTotal').replace('{value}', '').trim().replace(/:$/, '')}
              </span>
            </span>
          </div>
          <span className="text-sm font-semibold text-gray-700">{pct}%</span>
        </div>
        <div className="h-2 bg-surface-page rounded-full overflow-hidden border border-border">
          <div
            className="h-2 bg-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {!completed && audit.pendingCount === 0 && (
          <p className="mt-3 text-xs text-emerald-700">{t('stockAudits.allCountedHint')}</p>
        )}
        {completed && (
          <div className="mt-3 flex items-center justify-between gap-2 text-sm flex-wrap">
            <span className="inline-flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
              {t('audits.statusCompleted')}
            </span>
            <Button size="sm" variant="outline" onClick={() => router.push(auditsHref)}>
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              <span className="ms-1">{t('stockAudits.backToAudits')}</span>
            </Button>
          </div>
        )}
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

      {/* Pending */}
      {pending.length > 0 && (
        <div className="bg-surface-card rounded-lg border border-border mb-4">
          <div className="px-5 py-3 border-b border-border text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('stockAudits.pendingHeading').replace('{count}', String(pending.length))}
          </div>
          {pending.map((it) => (
            <StockAuditRow key={it.id} item={it} auditId={auditId} completed={completed} />
          ))}
        </div>
      )}

      {/* Counted */}
      {counted.length > 0 && (
        <div className="bg-surface-card rounded-lg border border-border">
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
