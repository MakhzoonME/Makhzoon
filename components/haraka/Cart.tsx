'use client';

import { useState } from 'react';
import { Plus, Minus, Trash2, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { usePosCart } from '@/store/pos-cart.store';
import { priceCart } from '@/lib/modules/haraka/pricing/calc';

interface CartProps {
  /** Defaults to true so existing callers (if any) keep prior behavior. */
  canRemoveItems?: boolean;
  canApplyDiscount?: boolean;
}

export function Cart({ canRemoveItems = true, canApplyDiscount = true }: CartProps = {}) {
  const lines = usePosCart((s) => s.lines);
  const incQty = usePosCart((s) => s.incQty);
  const setQty = usePosCart((s) => s.setQty);
  const setLineDiscount = usePosCart((s) => s.setLineDiscount);
  const removeLine = usePosCart((s) => s.removeLine);

  const priced = priceCart(lines);

  if (lines.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-1 py-10">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40">
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        <span className="text-xs">Cart is empty</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 divide-y divide-border overflow-y-auto -mx-1 px-1">
        {priced.lines.map((line) => (
          <CartLine
            key={line.itemId}
            line={line}
            canRemove={canRemoveItems}
            canApplyDiscount={canApplyDiscount}
            onInc={() => incQty(line.itemId, 1)}
            onDec={() => incQty(line.itemId, -1)}
            onQty={(v) => setQty(line.itemId, v)}
            onDiscount={(v) => setLineDiscount(line.itemId, v)}
            onRemove={() => removeLine(line.itemId)}
          />
        ))}
      </div>
    </div>
  );
}

interface CartLineProps {
  line: { itemId: string; itemName: string; unitPrice: number; taxRate: number; discount: number; quantity: number; lineTotal: number };
  canRemove: boolean;
  canApplyDiscount: boolean;
  onInc: () => void;
  onDec: () => void;
  onQty: (v: number) => void;
  onDiscount: (v: number) => void;
  onRemove: () => void;
}

function CartLine({ line, canRemove, canApplyDiscount, onInc, onDec, onQty, onDiscount, onRemove }: CartLineProps) {
  const [discOpen, setDiscOpen] = useState(false);

  return (
    <div className="py-2.5 space-y-1.5">
      <div className="flex items-start gap-2">
        {/* Name + price meta */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-tight truncate">{line.itemName}</div>
          <button
            type="button"
            disabled={!canApplyDiscount}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-0.5 transition-colors disabled:hover:text-gray-400 disabled:cursor-default"
            onClick={() => canApplyDiscount && setDiscOpen((o) => !o)}
          >
            <span className="font-mono">JOD {line.unitPrice.toFixed(2)}</span>
            {line.taxRate > 0 && <span className="font-mono">+{(line.taxRate * 100).toFixed(0)}%</span>}
            {line.discount > 0 && (
              <span className="text-amber-600 font-mono">−{line.discount.toFixed(2)}</span>
            )}
            {canApplyDiscount && (
              <ChevronDown size={10} className={`transition-transform ${discOpen ? 'rotate-180' : ''}`} />
            )}
          </button>
          {canApplyDiscount && discOpen && (
            <div className="flex items-center gap-1 mt-1">
              <Input
                type="number" min="0" step="0.01"
                value={line.discount || ''}
                placeholder="Discount"
                autoFocus
                onChange={(e) => onDiscount(Number(e.target.value || 0))}
                className="h-6 text-xs w-20 font-mono"
              />
              <span className="text-xs text-gray-400">off</span>
            </div>
          )}
        </div>

        {/* Qty controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            className="h-6 w-6 rounded-md border border-border flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors"
            onClick={onDec}
          >
            <Minus size={11} />
          </button>
          <Input
            type="number" min="0"
            value={line.quantity}
            onChange={(e) => onQty(Number(e.target.value || 0))}
            className="h-6 w-9 text-center text-xs font-mono p-0"
          />
          <button
            type="button"
            className="h-6 w-6 rounded-md border border-border flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors"
            onClick={onInc}
          >
            <Plus size={11} />
          </button>
        </div>

        {/* Line total + remove */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="font-mono text-sm font-semibold w-14 text-end">{line.lineTotal.toFixed(2)}</span>
          {canRemove && (
            <button
              type="button"
              className="h-6 w-6 rounded-md flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"
              onClick={onRemove}
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
