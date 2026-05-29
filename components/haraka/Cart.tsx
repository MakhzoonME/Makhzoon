'use client';

import { Plus, Minus, Trash2, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePosCart } from '@/store/pos-cart.store';
import { priceCart } from '@/lib/modules/haraka/pricing/calc';
import { useT } from '@/hooks/ui';

export function Cart() {
  const { t } = useT();
  const lines = usePosCart((s) => s.lines);
  const incQty = usePosCart((s) => s.incQty);
  const setQty = usePosCart((s) => s.setQty);
  const setLineDiscount = usePosCart((s) => s.setLineDiscount);
  const removeLine = usePosCart((s) => s.removeLine);

  const priced = priceCart(lines);

  if (lines.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-sm gap-2">
        <div>{t('cart.empty')}</div>
        <div className="text-xs">{t('cart.emptyHint')}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto -me-1 pe-1 divide-y divide-border">
        {priced.lines.map((line) => (
          <div key={line.itemId} className="py-2 grid grid-cols-[1fr_auto_auto] gap-2 items-center">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{line.itemName}</div>
              <div className="text-xs text-gray-500 font-mono">
                {line.unitPrice.toFixed(2)}
                {line.taxRate > 0 && <span> • +{(line.taxRate * 100).toFixed(0)}% tax</span>}
                {line.discount > 0 && <span className="text-amber-600"> • −{line.discount.toFixed(2)} disc</span>}
              </div>
              <div className="mt-1 flex items-center gap-1">
                <Percent size={11} className="text-gray-400" aria-hidden />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.discount || ''}
                  placeholder="Discount"
                  onChange={(e) => setLineDiscount(line.itemId, Number(e.target.value || 0))}
                  className="h-7 text-xs w-20"
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                onClick={() => incQty(line.itemId, -1)}
                aria-label={t('common.decrease')}
              >
                <Minus size={12} />
              </Button>
              <Input
                type="number"
                min="0"
                value={line.quantity}
                onChange={(e) => setQty(line.itemId, Number(e.target.value || 0))}
                className="h-7 w-12 text-center text-sm font-mono"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                onClick={() => incQty(line.itemId, 1)}
                aria-label={t('common.increase')}
              >
                <Plus size={12} />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm w-16 text-end">{line.lineTotal.toFixed(2)}</div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => removeLine(line.itemId)}
                aria-label={t('common.remove')}
              >
                <Trash2 size={12} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-3 mt-3 space-y-1 text-sm font-mono">
        <Row label={t('reports.subtotal')} value={priced.totals.subtotal} />
        <Row label={t('cart.discount')} value={-priced.totals.discountTotal} dim={priced.totals.discountTotal === 0} />
        <Row label={t('reports.tax')} value={priced.totals.taxTotal} dim={priced.totals.taxTotal === 0} />
        <div className="border-t border-border pt-2 mt-2 flex items-center justify-between text-base">
          <span className="font-medium font-sans">{t('col.total')}</span>
          <span className="font-bold">{priced.totals.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, dim }: { label: string; value: number; dim?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${dim ? 'text-gray-400' : ''}`}>
      <span className="font-sans text-sm">{label}</span>
      <span>{value.toFixed(2)}</span>
    </div>
  );
}
