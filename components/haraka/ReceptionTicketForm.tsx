'use client';

import { useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CustomerSelect } from '@/components/haraka/CustomerSelect';
import { ServiceLineEditor, type ServiceLineItem } from '@/components/haraka/ServiceLineEditor';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { useInventoryItems } from '@/hooks/inventory/useInventory';
import { useTaxRates } from '@/hooks/haraka';
import { toast, useT, useDebounce } from '@/hooks/ui';
import { formatCurrency } from '@/lib/utils/format';
import { priceCart } from '@/lib/modules/haraka/pricing/calc';

export interface TicketProductLine {
  itemId:    string;
  itemName:  string;
  sku:       string | null;
  barcode:   string | null;
  quantity:  number;
  unitPrice: number;
  taxRateId: string | null;
  taxRate:   number;
  discount:  number;
}

export interface ReceptionTicketFormValues {
  customerId:    string | null;
  customerName:  string;
  customerPhone: string;
  carPlate:      string;
  items:         TicketProductLine[];
  serviceItems:  ServiceLineItem[];
  /** ISO string, '' = not scheduled. Defaults to "now" on new tickets. */
  scheduledAt:   string;
  notes:         string;
}

interface Props {
  initial?:    ReceptionTicketFormValues;
  currency:    string;
  submitting:  boolean;
  submitLabel: string;
  onSubmit:    (values: ReceptionTicketFormValues) => void;
  onCancel:    () => void;
}

function emptyValues(): ReceptionTicketFormValues {
  return {
    customerId: null, customerName: '', customerPhone: '', carPlate: '',
    items: [], serviceItems: [], scheduledAt: new Date().toISOString(), notes: '',
  };
}

function serviceLineTotal(l: ServiceLineItem) {
  const net = Math.max(0, l.quantity * l.unitPrice - l.discountAmount);
  return net + net * l.taxRate;
}

export function ReceptionTicketForm({ initial, currency, submitting, submitLabel, onSubmit, onCancel }: Props) {
  const { t } = useT();
  const [values, setValues] = useState<ReceptionTicketFormValues>(() => initial ?? emptyValues());
  const [itemSearch, setItemSearch] = useState('');
  const [showItemSearch, setShowItemSearch] = useState(false);
  const debouncedSearch = useDebounce(itemSearch, 300);

  const { data: inventoryData } = useInventoryItems({
    search: debouncedSearch || undefined,
    posEnabled: true,
    pageSize: 12,
  });
  const { data: taxData } = useTaxRates();

  function patch(p: Partial<ReceptionTicketFormValues>) {
    setValues((v) => ({ ...v, ...p }));
  }

  function addProduct(inv: { id: string; name: string; sku?: string; barcode?: string | null; posPrice?: number | null; unitCost?: number; taxRateId?: string | null }) {
    const existing = values.items.find((l) => l.itemId === inv.id);
    if (existing) {
      patch({ items: values.items.map((l) => l.itemId === inv.id ? { ...l, quantity: l.quantity + 1 } : l) });
    } else {
      const taxRate = inv.taxRateId
        ? taxData?.taxRates.find((r) => r.id === inv.taxRateId)?.rate ?? 0
        : 0;
      patch({
        items: [...values.items, {
          itemId:    inv.id,
          itemName:  inv.name,
          sku:       inv.sku ?? null,
          barcode:   inv.barcode ?? null,
          quantity:  1,
          unitPrice: inv.posPrice ?? inv.unitCost ?? 0,
          taxRateId: inv.taxRateId ?? null,
          taxRate,
          discount:  0,
        }],
      });
    }
    setItemSearch('');
    setShowItemSearch(false);
  }

  function updateProduct(id: string, p: Partial<TicketProductLine>) {
    patch({ items: values.items.map((l) => (l.itemId === id ? { ...l, ...p } : l)) });
  }

  function removeProduct(id: string) {
    patch({ items: values.items.filter((l) => l.itemId !== id) });
  }

  const productTotals  = priceCart(values.items).totals;
  const validServices  = values.serviceItems.filter((l) => l.name.trim());
  const servicesTotal  = validServices.reduce((acc, l) => acc + serviceLineTotal(l), 0);
  const grandTotal     = productTotals.total + servicesTotal;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasIdentity =
      values.customerName.trim() || values.customerPhone.trim() || values.carPlate.trim();
    if (!hasIdentity) { toast.error(t('reception.errIdentityRequired')); return; }
    if (values.items.length === 0 && validServices.length === 0) {
      toast.error(t('reception.errLinesRequired'));
      return;
    }
    onSubmit({ ...values, serviceItems: validServices });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer */}
      <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">{t('reception.sectionCustomer')}</h3>
        <p className="text-xs text-gray-400">{t('reception.identityHint')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">{t('col.customer')}</label>
            <CustomerSelect
              value={values.customerId ? { id: values.customerId, name: values.customerName, phone: values.customerPhone || null } : null}
              onChange={(c) => patch({
                customerId:    c?.id ?? null,
                customerName:  c?.name ?? values.customerName,
                customerPhone: c?.phone ?? values.customerPhone,
              })}
            />
          </div>
          {!values.customerId && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{t('reception.labelWalkInName')}</label>
              <Input
                value={values.customerName}
                onChange={(e) => patch({ customerName: e.target.value })}
                placeholder={t('reception.walkInPlaceholder')}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">{t('col.phone')}</label>
            <Input value={values.customerPhone} onChange={(e) => patch({ customerPhone: e.target.value })} placeholder="+962 7…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">{t('reception.labelCarPlate')}</label>
            <Input
              value={values.carPlate}
              onChange={(e) => patch({ carPlate: e.target.value })}
              placeholder={t('reception.carPlatePlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">{t('reception.sectionProducts')}</h3>
        <div className="relative">
          <div className="relative">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('reception.searchProducts')}
              className="ps-9"
              value={itemSearch}
              onChange={(e) => { setItemSearch(e.target.value); setShowItemSearch(true); }}
              onFocus={() => setShowItemSearch(true)}
              onBlur={() => setTimeout(() => setShowItemSearch(false), 200)}
            />
          </div>
          {showItemSearch && (inventoryData?.items ?? []).length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-white shadow-lg max-h-48 overflow-y-auto">
              {(inventoryData?.items ?? []).map((inv) => (
                <button
                  key={inv.id}
                  type="button"
                  className="w-full text-start px-3 py-2 text-sm hover:bg-accent flex items-center justify-between"
                  onMouseDown={() => addProduct(inv)}
                >
                  <span>
                    <span className="font-medium">{inv.name}</span>
                    {inv.sku && <span className="text-gray-400 text-xs ms-2">#{inv.sku}</span>}
                  </span>
                  <span className="font-mono text-xs text-gray-500">
                    {formatCurrency(inv.posPrice ?? inv.unitCost ?? 0, currency)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {values.items.length > 0 ? (
          <div className="space-y-2">
            {values.items.map((line) => {
              const net = Math.max(0, line.quantity * line.unitPrice - line.discount);
              const lineTotal = net + net * line.taxRate;
              return (
                <div key={line.itemId} className="flex items-center gap-2 rounded-lg border border-border bg-surface-inset px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{line.itemName}</div>
                    {line.sku && <div className="text-xs text-gray-400">#{line.sku}</div>}
                  </div>
                  <Input
                    type="number"
                    min="1"
                    className="w-16 h-8 text-sm text-center"
                    value={line.quantity}
                    onChange={(e) => updateProduct(line.itemId, { quantity: Math.max(1, Number(e.target.value)) })}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-24 h-8 text-sm text-end font-mono"
                    value={line.unitPrice}
                    onChange={(e) => updateProduct(line.itemId, { unitPrice: Number(e.target.value) })}
                  />
                  <span className="text-sm font-mono w-20 text-end tabular-nums">
                    {formatCurrency(lineTotal, currency)}
                  </span>
                  <button type="button" onClick={() => removeProduct(line.itemId)} className="p-1 text-gray-300 hover:text-red-500 rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-center text-muted-foreground py-3">{t('reception.noProducts')}</p>
        )}
      </div>

      {/* Services */}
      <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">{t('reception.sectionServices')}</h3>
        <ServiceLineEditor
          lines={values.serviceItems}
          onChange={(serviceItems) => patch({ serviceItems })}
          currency={currency}
        />
      </div>

      {/* Schedule + notes + totals */}
      <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">{t('serviceJobs.labelScheduled')}</label>
            <DateTimePicker
              value={values.scheduledAt}
              onChange={(scheduledAt) => patch({ scheduledAt })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">{t('col.notes')}</label>
          <Textarea value={values.notes} onChange={(e) => patch({ notes: e.target.value })} rows={2} />
        </div>
        <div className="space-y-1 pt-2 border-t border-border">
          <div className="flex justify-between text-xs text-gray-500 font-mono">
            <span>{t('reception.productsTotal')}</span>
            <span>{formatCurrency(productTotals.total, currency)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 font-mono">
            <span>{t('reception.servicesTotal')}</span>
            <span>{formatCurrency(servicesTotal, currency)}</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-sm font-semibold">{t('col.total')}</span>
            <span className="text-lg font-bold font-mono" style={{ color: 'var(--mod-haraka)' }}>
              {formatCurrency(grandTotal, currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={submitting} className="flex-1" style={{ background: 'var(--mod-haraka)' }}>
          {submitting ? t('common.saving') : submitLabel}
        </Button>
      </div>
    </form>
  );
}
