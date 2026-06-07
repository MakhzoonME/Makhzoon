'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ServiceLineItem {
  name:           string;
  description:    string;
  quantity:       number;
  unitPrice:      number;
  taxRate:        number;
  discountAmount: number;
}

interface Props {
  lines:     ServiceLineItem[];
  onChange:  (lines: ServiceLineItem[]) => void;
  currency?: string;
  disabled?: boolean;
}

function emptyLine(): ServiceLineItem {
  return { name: '', description: '', quantity: 1, unitPrice: 0, taxRate: 0, discountAmount: 0 };
}

export function ServiceLineEditor({ lines, onChange, currency = 'JOD', disabled }: Props) {
  function update(index: number, patch: Partial<ServiceLineItem>) {
    const next = lines.map((l, i) => (i === index ? { ...l, ...patch } : l));
    onChange(next);
  }

  function addLine() {
    onChange([...lines, emptyLine()]);
  }

  function removeLine(index: number) {
    onChange(lines.filter((_, i) => i !== index));
  }

  const lineTotal = (l: ServiceLineItem) => {
    const gross   = l.quantity * l.unitPrice;
    const net     = Math.max(0, gross - l.discountAmount);
    const tax     = net * l.taxRate;
    return net + tax;
  };

  const grandTotal = lines.reduce((acc, l) => acc + lineTotal(l), 0);

  return (
    <div className="space-y-3">
      {lines.map((line, idx) => (
        <div key={idx} className="rounded-xl border border-border bg-surface-page p-4 space-y-3">
          <div className="flex items-start gap-3">
            {/* Service name */}
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Service *</label>
              <Input
                value={line.name}
                onChange={(e) => update(idx, { name: e.target.value })}
                placeholder="e.g. Website design, AC maintenance…"
                disabled={disabled}
                className="text-sm"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-600 hover:bg-red-50 mt-6 h-8 w-8 p-0 flex-shrink-0"
              onClick={() => removeLine(idx)}
              disabled={disabled || lines.length === 1}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Description</label>
            <Input
              value={line.description}
              onChange={(e) => update(idx, { description: e.target.value })}
              placeholder="Optional details…"
              disabled={disabled}
              className="text-sm"
            />
          </div>

          {/* Qty / Price / Tax / Discount */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Qty</label>
              <Input
                type="number" min="0.001" step="0.001"
                value={line.quantity}
                onChange={(e) => update(idx, { quantity: parseFloat(e.target.value) || 1 })}
                disabled={disabled}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Unit price</label>
              <Input
                type="number" min="0" step="0.001"
                value={line.unitPrice}
                onChange={(e) => update(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                disabled={disabled}
                className="font-mono text-sm"
                placeholder="0.000"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Tax %</label>
              <Input
                type="number" min="0" max="100" step="0.01"
                value={line.taxRate * 100}
                onChange={(e) => update(idx, { taxRate: (parseFloat(e.target.value) || 0) / 100 })}
                disabled={disabled}
                className="font-mono text-sm"
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Discount</label>
              <Input
                type="number" min="0" step="0.001"
                value={line.discountAmount}
                onChange={(e) => update(idx, { discountAmount: parseFloat(e.target.value) || 0 })}
                disabled={disabled}
                className="font-mono text-sm"
                placeholder="0.000"
              />
            </div>
          </div>

          <div className="flex justify-end text-sm font-mono font-semibold text-gray-800">
            {lineTotal(line).toFixed(3)} {currency}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addLine}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 py-2 rounded-xl border border-dashed border-primary-200 hover:border-primary-400 transition-colors disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.75} /> Add service line
      </button>

      {lines.length > 0 && (
        <div className="flex justify-end text-sm font-semibold text-gray-800 pt-1">
          Total: <span className="font-mono ml-2">{grandTotal.toFixed(3)} {currency}</span>
        </div>
      )}
    </div>
  );
}
