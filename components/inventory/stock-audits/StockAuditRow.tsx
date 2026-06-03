'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/hooks/ui';
import { useSubmitStockAuditItem } from '@/hooks/inventory';
import { toast } from '@/hooks/ui';
import type { StockAuditItem } from '@/types/stock-audit.types';
import { cn } from '@/lib/utils/cn';

interface Props {
  item: StockAuditItem;
  auditId: string;
  completed: boolean;
}

/** Per-item row in the audit detail page. Counted-qty + note + save, with
 *  optimistic mutation from the parent hook so the row flips to "counted"
 *  immediately on submit. */
export function StockAuditRow({ item, auditId, completed }: Props) {
  const { t } = useT();
  const submit = useSubmitStockAuditItem(auditId);
  const [counted, setCounted] = useState<string>(
    item.countedQuantity == null ? '' : String(item.countedQuantity),
  );
  const [note, setNote] = useState<string>(item.note ?? '');

  // Sync local edits if cache refreshes (e.g. after invalidate).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCounted(item.countedQuantity == null ? '' : String(item.countedQuantity));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNote(item.note ?? '');
  }, [item.countedQuantity, item.note]);

  const expected = item.expectedQuantity;
  const parsedCounted = counted === '' ? null : Number(counted);
  const variance =
    parsedCounted == null || Number.isNaN(parsedCounted) ? null : parsedCounted - expected;
  const isCounted = item.status === 'counted';

  function handleSave() {
    if (counted === '' || Number.isNaN(Number(counted)) || Number(counted) < 0) return;
    submit.mutate(
      { auditItemId: item.id, countedQuantity: Number(counted), note: note || undefined },
      {
        onError: () => toast.error(t('stockAudits.saveFailed')),
      },
    );
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border last:border-0',
        isCounted && variance != null && variance === 0 && 'bg-emerald-500/5',
        isCounted && variance != null && variance !== 0 && 'bg-amber-500/5',
      )}
    >
      <div className="flex-shrink-0 w-6">
        {isCounted ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" strokeWidth={1.75} />
        ) : (
          <Clock className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900">{item.itemName}</div>
        <div className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
          {item.itemSku && <span className="font-mono">{item.itemSku}</span>}
          {item.itemCategory && <span>{item.itemCategory}</span>}
          {item.itemLocation && <span>{item.itemLocation}</span>}
        </div>
      </div>

      {/* Expected (read-only) */}
      <div className="flex items-baseline gap-1 text-sm">
        <span className="text-gray-400 text-xs">{t('stockAudits.expected')}</span>
        <span className="font-semibold text-gray-700 tabular-nums">
          {expected}
          {item.itemUnit ? ` ${item.itemUnit}` : ''}
        </span>
      </div>

      {!completed ? (
        <>
          <Input
            type="number"
            min={0}
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
            placeholder={t('stockAudits.counted')}
            className="h-8 text-sm w-24 tabular-nums"
            disabled={submit.isPending}
          />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('stockAudits.notePlaceholder')}
            className="h-8 text-xs w-40"
            disabled={submit.isPending}
          />
          {variance != null && (
            <span
              className={cn(
                'text-xs font-medium tabular-nums px-2 py-0.5 rounded-full border',
                variance === 0 && 'bg-emerald-50 text-emerald-700 border-emerald-100',
                variance > 0 && 'bg-emerald-50 text-emerald-700 border-emerald-100',
                variance < 0 && 'bg-red-50 text-red-600 border-red-100',
              )}
            >
              {variance > 0 ? `+${variance}` : variance}
            </span>
          )}
          <Button
            size="sm"
            variant={isCounted ? 'outline' : 'default'}
            disabled={submit.isPending || counted === ''}
            onClick={handleSave}
          >
            {submit.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : null}
            <span className={submit.isPending ? 'ms-1' : ''}>
              {isCounted ? t('stockAudits.update') : t('stockAudits.save')}
            </span>
          </Button>
        </>
      ) : (
        <div className="flex items-baseline gap-3 text-sm">
          <span className="text-gray-400 text-xs">{t('stockAudits.counted')}</span>
          <span className="font-semibold text-gray-900 tabular-nums">
            {item.countedQuantity == null ? '—' : item.countedQuantity}
          </span>
          {variance != null && (
            <span
              className={cn(
                'text-xs font-medium tabular-nums',
                variance === 0 && 'text-emerald-600',
                variance > 0 && 'text-emerald-600',
                variance < 0 && 'text-red-600',
              )}
            >
              {variance > 0 ? `+${variance}` : variance}
            </span>
          )}
          {item.note && <span className="italic text-gray-500">{item.note}</span>}
        </div>
      )}
    </div>
  );
}
