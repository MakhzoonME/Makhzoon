'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/hooks/ui';
import { ServicePicker } from './ServicePicker';
import type { HarakaService } from '@/types';

export interface ServiceLineItem {
  name:           string;
  description:    string;
  quantity:       number;
  unitPrice:      number;
  discountAmount: number;
}

interface Props {
  lines:     ServiceLineItem[];
  onChange:  (lines: ServiceLineItem[]) => void;
  currency?: string;
  disabled?: boolean;
  /** When true, price/discount inputs and totals are hidden (name/qty stay editable). */
  readOnlyPricing?: boolean;
}

function emptyLine(): ServiceLineItem {
  return { name: '', description: '', quantity: 1, unitPrice: 0, discountAmount: 0 };
}

export function ServiceLineEditor({ lines, onChange, currency = 'JOD', disabled, readOnlyPricing }: Props) {
  const { t } = useT();

  function update(index: number, patch: Partial<ServiceLineItem>) {
    onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() { onChange([...lines, emptyLine()]); }
  function removeLine(index: number) { onChange(lines.filter((_, i) => i !== index)); }

  function addLineFromCatalog(service: HarakaService) {
    onChange([...lines, {
      name: service.name,
      description: service.description ?? '',
      quantity: 1,
      unitPrice: service.price,
      discountAmount: 0,
    }]);
  }

  const lineTotal = (l: ServiceLineItem) => {
    const gross = l.quantity * l.unitPrice;
    return Math.max(0, gross - l.discountAmount);
  };

  const grandTotal = lines.reduce((acc, l) => acc + lineTotal(l), 0);

  return (
    <div className="space-y-3">
      {lines.map((line, idx) => (
        <div key={idx} className="rounded-xl border border-border bg-surface-page p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{t('serviceLine.labelService')} *</label>
              <Input
                value={line.name}
                onChange={(e) => update(idx, { name: e.target.value })}
                placeholder={t('serviceLine.placeholder')}
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

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">{t('serviceLine.labelDescription')}</label>
            <Input
              value={line.description}
              onChange={(e) => update(idx, { description: e.target.value })}
              placeholder={t('serviceLine.descPlaceholder')}
              disabled={disabled}
              className="text-sm"
            />
          </div>

          <div className={`grid grid-cols-2 gap-3 ${readOnlyPricing ? '' : 'sm:grid-cols-3'}`}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{t('serviceLine.labelQty')}</label>
              <Input
                type="number" min="0.001" step="0.001"
                value={line.quantity}
                onChange={(e) => update(idx, { quantity: parseFloat(e.target.value) || 1 })}
                disabled={disabled}
                className="font-mono text-sm"
              />
            </div>
            {!readOnlyPricing && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">{t('serviceLine.labelUnitPrice')}</label>
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
                  <label className="text-xs font-medium text-gray-600">{t('serviceLine.labelDiscount')}</label>
                  <Input
                    type="number" min="0" step="0.001"
                    value={line.discountAmount}
                    onChange={(e) => update(idx, { discountAmount: parseFloat(e.target.value) || 0 })}
                    disabled={disabled}
                    className="font-mono text-sm"
                    placeholder="0.000"
                  />
                </div>
              </>
            )}
          </div>

          {!readOnlyPricing && (
            <div className="flex justify-end text-sm font-mono font-semibold text-gray-800">
              {lineTotal(line).toFixed(3)} {currency}
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={addLine}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 py-2 rounded-xl border border-dashed border-primary-200 hover:border-primary-400 transition-colors disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} /> {t('serviceLine.addLine')}
        </button>
        {!readOnlyPricing && <ServicePicker onPick={addLineFromCatalog} disabled={disabled} />}
      </div>

      {!readOnlyPricing && lines.length > 0 && (
        <div className="flex justify-end text-sm font-semibold text-gray-800 pt-1">
          {t('serviceLine.total')} <span className="font-mono ms-2">{grandTotal.toFixed(3)} {currency}</span>
        </div>
      )}
    </div>
  );
}
