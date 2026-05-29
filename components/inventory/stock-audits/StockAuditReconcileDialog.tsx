'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogIconHeader,
  DialogBody,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/hooks/ui';
import { ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { StockAuditItem, StockAuditAdjustment } from '@/types/stock-audit.types';

type Decision = 'apply' | 'skip' | 'edit';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: StockAuditItem[];
  submitting: boolean;
  onSubmit: (adjustments: Record<string, StockAuditAdjustment>) => void;
}

/**
 * Per-row review of every non-zero variance, gathered in a single PATCH on
 * Complete. Default is 'apply' for non-zero variances; 'edit' lets the user
 * type a different target qty. Zero-variance rows are skipped entirely
 * (they would be no-ops at the ledger anyway).
 */
export function StockAuditReconcileDialog({
  open,
  onOpenChange,
  items,
  submitting,
  onSubmit,
}: Props) {
  const { t } = useT();
  const variances = useMemo(() => {
    return items
      .filter((it) => it.status === 'counted' && it.countedQuantity != null)
      .filter((it) => Math.abs((it.countedQuantity as number) - it.expectedQuantity) > 0);
  }, [items]);

  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  function setDecision(id: string, d: Decision) {
    setDecisions((prev) => ({ ...prev, [id]: d }));
  }

  function decisionOf(id: string): Decision {
    return decisions[id] ?? 'apply';
  }

  function submit() {
    const adjustments: Record<string, StockAuditAdjustment> = {};
    for (const it of variances) {
      const d = decisionOf(it.id);
      if (d === 'apply') adjustments[it.id] = 'apply';
      else if (d === 'skip') adjustments[it.id] = 'skip';
      else if (d === 'edit') {
        const raw = overrides[it.id];
        const parsed = raw == null || raw === '' ? NaN : Number(raw);
        if (!Number.isNaN(parsed) && parsed >= 0) {
          adjustments[it.id] = parsed;
        } else {
          adjustments[it.id] = 'skip';
        }
      }
    }
    onSubmit(adjustments);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px]">
        <DialogIconHeader
          icon={<ClipboardCheck className="h-4 w-4" strokeWidth={1.75} />}
          title={t('stockAudits.reviewTitle')}
        />
        <DialogBody>
          <DialogDescription className="mt-0 mb-3">
            {t('stockAudits.reviewSubtitle')}
          </DialogDescription>

          {variances.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              {t('stockAudits.noVariances')}
            </p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[1.6fr_64px_64px_64px_1.4fr] gap-2 px-3 py-2 bg-surface-page text-[11px] font-semibold text-gray-500 uppercase">
                <span>{t('stockAudits.itemsHeading')}</span>
                <span className="text-end">{t('stockAudits.expected')}</span>
                <span className="text-end">{t('stockAudits.counted')}</span>
                <span className="text-end">{t('stockAudits.variance')}</span>
                <span />
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {variances.map((it) => {
                  const expected = it.expectedQuantity;
                  const counted = it.countedQuantity as number;
                  const variance = counted - expected;
                  const d = decisionOf(it.id);
                  return (
                    <div
                      key={it.id}
                      className="grid grid-cols-[1.6fr_64px_64px_64px_1.4fr] gap-2 px-3 py-2.5 border-t border-border items-center text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{it.itemName}</div>
                        {it.itemSku && (
                          <div className="text-[11px] text-gray-500 font-mono truncate">
                            {it.itemSku}
                          </div>
                        )}
                      </div>
                      <span className="text-end tabular-nums text-gray-700">{expected}</span>
                      <span className="text-end tabular-nums text-gray-900 font-medium">
                        {counted}
                      </span>
                      <span
                        className={cn(
                          'text-end tabular-nums font-semibold',
                          variance > 0 ? 'text-emerald-600' : 'text-red-600',
                        )}
                      >
                        {variance > 0 ? `+${variance}` : variance}
                      </span>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDecision(it.id, 'apply')}
                          className={cn(
                            'text-xs px-2 py-1 rounded border transition-colors',
                            d === 'apply'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                              : 'border-border text-gray-500 hover:bg-surface-page',
                          )}
                        >
                          {t('stockAudits.actionApply')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDecision(it.id, 'skip')}
                          className={cn(
                            'text-xs px-2 py-1 rounded border transition-colors',
                            d === 'skip'
                              ? 'bg-gray-100 border-gray-300 text-gray-700'
                              : 'border-border text-gray-500 hover:bg-surface-page',
                          )}
                        >
                          {t('stockAudits.actionSkip')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDecision(it.id, 'edit')}
                          className={cn(
                            'text-xs px-2 py-1 rounded border transition-colors',
                            d === 'edit'
                              ? 'bg-amber-50 border-amber-300 text-amber-700'
                              : 'border-border text-gray-500 hover:bg-surface-page',
                          )}
                        >
                          {t('stockAudits.actionEdit')}
                        </button>
                        {d === 'edit' && (
                          <Input
                            type="number"
                            min={0}
                            value={overrides[it.id] ?? String(counted)}
                            onChange={(e) =>
                              setOverrides((prev) => ({ ...prev, [it.id]: e.target.value }))
                            }
                            className="h-7 text-xs w-16"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? t('stockAudits.completing') : t('stockAudits.completeAudit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
