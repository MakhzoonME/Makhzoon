'use client';

import { useState } from 'react';
import { Plus, Minus, Trash2, ChevronDown } from 'lucide-react';
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
          <CartLine
            key={line.itemId}
            line={line}
            onInc={() => incQty(line.itemId, 1)}
            onDec={() => incQty(line.itemId, -1)}
            onQty={(v) => setQty(line.itemId, v)}
            onDiscount={(v) => setLineDiscount(line.itemId, v)}
            onRemove={() => removeLine(line.itemId)}
            t={t}
          />
        ))}
      </div>

      <div className="border-t border-border pt-3 mt-3 space-y-1 text-sm font-mono">
        <Row label={t('reports.subtotal')} value={priced.totals.subtotal} />
        <Row label={t('cart.discount')} value={-priced.totals.discountTotal} dim={priced.totals.discountTotal === 0} />
        <Row label={t('reports.tax')} value={priced.totals.taxTotal} dim={priced.totals.taxTotal === 0} />
        <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
          <span className="text-sm font-semibold font-sans">{t('col.total')}</span>
          <span className="text-xl font-bold font-mono" style={{ color: 'var(--mod-haraka)' }}>
            {priced.totals.total.toFixed(2)}
          </span>
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

interface CartLineProps {
  line: { itemId: string; itemName: string; unitPrice: number; taxRate: number; discount: number; quantity: number; lineTotal: number };
  onInc: () => void;
  onDec: () => void;
  onQty: (v: number) => void;
  onDiscount: (v: number) => void;
  onRemove: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: any) => string;
}

function CartLine({ line, onInc, onDec, onQty, onDiscount, onRemove, t }: CartLineProps) {
  const [discountOpen, setDiscountOpen] = useState(false);
  return (
    <div className="py-2 space-y-1.5">
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-start">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{line.itemName}</div>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
            onClick={() => setDiscountOpen((o) => !o)}
          >
            <span className="font-mono">{line.unitPrice.toFixed(2)}</span>
            {line.taxRate > 0 && <span className="font-mono"> +{(line.taxRate * 100).toFixed(0)}%</span>}
            {line.discount > 0 && (
              <span className="text-amber-600 font-mono"> −{line.discount.toFixed(2)}</span>
            )}
            <ChevronDown size={10} className={`transition-transform ${discountOpen ? 'rotate-180' : ''}`} />
          </button>
          {discountOpen && (
            <div className="mt-1 flex items-center gap-1.5">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={line.discount || ''}
                placeholder="Discount"
                autoFocus
                onChange={(e) => onDiscount(Number(e.target.value || 0))}
                className="h-6 text-xs w-20"
              />
              <span className="text-xs text-gray-400">disc</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={onDec} aria-label={t('common.decrease')}>
            <Minus size={11} />
          </Button>
          <Input
            type="number"
            min="0"
            value={line.quantity}
            onChange={(e) => onQty(Number(e.target.value || 0))}
            className="h-6 w-10 text-center text-xs font-mono"
          />
          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={onInc} aria-label={t('common.increase')}>
            <Plus size={11} />
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="font-mono text-sm w-14 text-end">{line.lineTotal.toFixed(2)}</div>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onRemove} aria-label={t('common.remove')}>
            <Trash2 size={11} />
          </Button>
        </div>
      </div>
    </div>
  );
}
