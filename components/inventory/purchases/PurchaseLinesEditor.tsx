'use client';

import { useCallback, useState } from 'react';
import { Plus, Trash2, ScanBarcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarcodeInput } from '@/components/shared';
import { useBarcodeLookup } from '@/hooks/inventory';
import { useTaxRates } from '@/hooks/haraka';
import { toast, useT } from '@/hooks/ui';
import type { PurchaseLineFormData } from '@/lib/modules/inventory/purchases/schemas';

interface Props {
  value: PurchaseLineFormData[];
  onChange: (lines: PurchaseLineFormData[]) => void;
}

function emptyLine(): PurchaseLineFormData {
  return {
    itemId: null,
    itemName: '',
    sku: null,
    barcode: '',
    quantity: 1,
    unitCost: 0,
    taxRateId: '',
    notes: null,
  };
}

/**
 * Editable table of purchase lines with barcode-driven row insertion.
 *
 * Scanner workflow (right pane): the cashier scans a barcode → if it matches
 * an existing item, a new line is appended pre-filled with name/sku/last cost.
 * Unknown barcode → an "unresolved" line is added with the barcode populated;
 * the user can type a name and create the item later, or pick an existing item.
 *
 * Manual workflow: the "Add line" button inserts a blank line for free-form entry.
 */
export function PurchaseLinesEditor({ value, onChange }: Props) {
  const { t } = useT();
  const { lookup } = useBarcodeLookup();
  const { data: taxData } = useTaxRates();
  const taxRates = taxData?.taxRates ?? [];
  const [scanning, setScanning] = useState(false);

  const handleScan = useCallback(
    async (code: string) => {
      setScanning(true);
      try {
        const result = await lookup(code);
        if (result.found) {
          // Append a new line pre-filled from the matched item.
          const item = result.item;
          // If the same itemId already exists, just bump its quantity.
          const existingIdx = value.findIndex((l) => l.itemId === item.id);
          if (existingIdx >= 0) {
            const next = [...value];
            next[existingIdx] = { ...next[existingIdx], quantity: next[existingIdx].quantity + 1 };
            onChange(next);
            toast.success(`Incremented ${item.name} (×${next[existingIdx].quantity})`);
          } else {
            onChange([
              ...value,
              {
                itemId: item.id,
                itemName: item.name,
                sku: item.sku ?? null,
                barcode: item.barcode ?? code,
                quantity: 1,
                unitCost: item.unitCost ?? 0,
                taxRateId: item.taxRateId ?? '',
                notes: null,
              },
            ]);
            toast.success(`Added ${item.name}`);
          }
        } else {
          // Unknown barcode → add an unresolved line so the user can name + price it inline.
          onChange([
            ...value,
            {
              itemId: null,
              itemName: '',
              sku: null,
              barcode: code,
              quantity: 1,
              unitCost: 0,
              taxRateId: '',
              notes: 'New item — set name before receiving',
            },
          ]);
          toast.info('Unknown barcode — fill in the name to create a new item');
        }
      } catch {
        toast.error('Lookup failed');
      } finally {
        setScanning(false);
      }
    },
    [lookup, value, onChange],
  );

  function updateLine(idx: number, patch: Partial<PurchaseLineFormData>) {
    const next = [...value];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }

  function removeLine(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function addBlankLine() {
    onChange([...value, emptyLine()]);
  }

  const subtotal = value.reduce((acc, l) => acc + l.quantity * l.unitCost, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-md">
          <BarcodeInput
            onResolve={handleScan}
            placeholder="Scan or type a barcode to add a line"
            disabled={scanning}
          />
        </div>
        <Button type="button" variant="outline" onClick={addBlankLine}>
          <Plus size={14} className="me-1" /> Add line manually
        </Button>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-start">
            <tr>
              <th className="px-3 py-2 font-medium w-8">#</th>
              <th className="px-3 py-2 font-medium">Item / Barcode</th>
              <th className="px-3 py-2 font-medium w-24">Qty</th>
              <th className="px-3 py-2 font-medium w-28">Unit cost</th>
              <th className="px-3 py-2 font-medium w-40">Tax rate</th>
              <th className="px-3 py-2 font-medium w-24 text-end">Line total</th>
              <th className="px-3 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {value.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  No lines yet — scan a barcode above or add a line manually.
                </td>
              </tr>
            )}
            {value.map((line, idx) => {
              const lineSubtotal = line.quantity * line.unitCost;
              const taxRate = line.taxRateId ? taxRates.find((tr) => tr.id === line.taxRateId)?.rate ?? 0 : 0;
              const taxAmount = lineSubtotal * taxRate;
              const lineTotal = lineSubtotal + taxAmount;
              const unresolved = !line.itemId;
              return (
                <tr key={idx} className="border-t">
                  <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      <Input
                        value={line.itemName}
                        onChange={(e) => updateLine(idx, { itemName: e.target.value })}
                        placeholder="Item name"
                      />
                      {line.barcode && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                          <ScanBarcode size={12} aria-hidden /> {line.barcode}
                          {unresolved && <span className="text-amber-600 ms-2">(new item)</span>}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, { quantity: Number(e.target.value || 0) })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitCost}
                      onChange={(e) => updateLine(idx, { unitCost: Number(e.target.value || 0) })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={line.taxRateId || '__none__'}
                      onValueChange={(v) => updateLine(idx, { taxRateId: v === '__none__' ? '' : v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No tax</SelectItem>
                        {taxRates.map((tr) => (
                          <SelectItem key={tr.id} value={tr.id}>
                            {tr.name} ({(tr.rate * 100).toFixed(1)}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2 text-end font-mono">{lineTotal.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      onClick={() => removeLine(idx)}
                      aria-label={t('common.remove')}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {value.length > 0 && (
            <tfoot>
              <tr className="border-t bg-gray-50 dark:bg-gray-800">
                <td colSpan={5} className="px-3 py-2 text-end font-medium">
                  Subtotal (excl. tax)
                </td>
                <td className="px-3 py-2 text-end font-mono font-semibold">{subtotal.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
