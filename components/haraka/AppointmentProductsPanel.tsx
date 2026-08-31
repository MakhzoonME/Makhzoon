'use client';

import { useState } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InventoryItemPicker } from '@/components/inventory/purchases/InventoryItemPicker';
import {
  useAppointmentProducts,
  useAddAppointmentProduct,
  useRemoveAppointmentProduct,
} from '@/hooks/haraka';
import { toast, useT } from '@/hooks/ui';
import { formatCurrency } from '@/lib/utils/format';
import type { HarakaAppointment, InventoryItem } from '@/types';

interface Props {
  appointment: HarakaAppointment;
  currency?: string;
  readOnly?: boolean;
}

/** Stock-tracked products (an injection, medicine) dispensed during an
 *  appointment, alongside its single booked service. Addable at any
 *  appointment status — unlike payments, a product used during a visit
 *  still needs recording even if the visit is later cancelled/no-show.
 *
 *  Stock itself deducts once the appointment receives its first payment
 *  (and restocks if payments are removed back down to zero) — see
 *  AppointmentsRepository.addPayment/removePayment. */
export function AppointmentProductsPanel({ appointment, currency = 'JOD', readOnly }: Props) {
  const { data } = useAppointmentProducts(appointment.id);
  const addMut = useAddAppointmentProduct();
  const removeMut = useRemoveAppointmentProduct();
  const { t } = useT();

  const [showForm, setShowForm] = useState(false);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');

  const products = data?.products ?? [];
  const subtotal = products.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);

  function resetForm() {
    setItem(null);
    setQuantity('1');
    setUnitPrice('');
    setShowForm(false);
  }

  function handlePick(picked: InventoryItem) {
    setItem(picked);
    if (picked.posPrice != null) setUnitPrice(String(picked.posPrice));
  }

  async function handleAdd() {
    if (!item) { toast.error(t('productPanel.pickProduct')); return; }
    const qty = parseInt(quantity, 10);
    if (!Number.isFinite(qty) || qty <= 0) { toast.error(t('productPanel.enterValidQuantity')); return; }
    const price = parseFloat(unitPrice) || 0;
    try {
      await addMut.mutateAsync({
        appointmentId: appointment.id,
        itemId: item.id,
        quantity: qty,
        unitPrice: price,
      });
      toast.success(t('productPanel.saveProduct'));
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    }
  }

  async function handleRemove(productId: string) {
    try {
      await removeMut.mutateAsync({ appointmentId: appointment.id, productId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t('productPanel.sectionLabel')}
        </span>
      </div>

      {products.length > 0 && (
        <div className="space-y-1.5">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <div className="flex-1 flex items-center gap-2 text-gray-600">
                <span>{p.itemName}</span>
                <span className="text-gray-400 text-xs">× {p.quantity}</span>
              </div>
              <span className="font-mono font-medium text-gray-800">
                {formatCurrency(p.quantity * p.unitPrice, currency)}
              </span>
              {!readOnly && (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Remove product"
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 h-6 w-6 p-0"
                  onClick={() => handleRemove(p.id)}
                  disabled={removeMut.isPending}
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                </Button>
              )}
            </div>
          ))}
          <div className="flex justify-between text-sm font-semibold text-gray-800 border-t border-border pt-1.5">
            <span>{t('productPanel.subtotal')}</span>
            <span className="font-mono">{formatCurrency(subtotal, currency)}</span>
          </div>
        </div>
      )}

      {!readOnly && (
        !showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 py-1 rounded-lg border border-dashed border-primary-200 hover:border-primary-400 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} /> {t('productPanel.addEntry')}
          </button>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <InventoryItemPicker onPick={handlePick} selectedItemId={item?.id} />
              {item && <span className="text-sm text-gray-700 truncate">{item.name}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">
                  {t('productPanel.quantityLabel')} *
                </label>
                <Input
                  type="number" min="1" step="1"
                  value={quantity} onChange={(e) => setQuantity(e.target.value)}
                  className="font-mono text-sm h-8"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">
                  {t('productPanel.unitPriceLabel')}
                </label>
                <Input
                  type="number" min="0" step="0.001"
                  value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0.000" className="font-mono text-sm h-8"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={resetForm} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button
                size="sm" onClick={handleAdd} disabled={addMut.isPending}
                className="flex-1" style={{ background: 'var(--mod-haraka)' }}
              >
                {addMut.isPending ? t('productPanel.savingProduct') : t('productPanel.saveProduct')}
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
