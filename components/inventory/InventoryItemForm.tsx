'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { ScanBarcode } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { useOrgSlug, useSpace, useT } from '@/hooks/ui';
import { inventoryItemSchema, InventoryItemFormData } from '@/lib/validations/inventory.schema';
import { InventoryItem } from '@/types';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { DocumentUpload } from '@/components/shared';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useTaxRates } from '@/hooks/haraka';
interface Props { item?: InventoryItem; onSuccess?: () => void; onCancel?: () => void; onDirtyChange?: (dirty: boolean) => void; }

export function InventoryItemForm({ item, onSuccess, onCancel, onDirtyChange }: Props) {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const { locale } = useT();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const { data: taxRatesData } = useTaxRates();
  const taxRates = taxRatesData?.taxRates ?? [];

  const form = useForm<InventoryItemFormData>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      name: item?.name ?? '',
      category: item?.category ?? '',
      sku: item?.sku ?? '',
      unit: item?.unit ?? 'each',
      quantityOnHand: item?.quantityOnHand ?? 0,
      minimumThreshold: item?.minimumThreshold ?? 5,
      reorderQuantity: item?.reorderQuantity ?? '',
      location: item?.location ?? '',
      supplier: item?.supplier ?? '',
      unitCost: item?.unitCost ?? '',
      notes: item?.notes ?? '',
      barcode: item?.barcode ?? '',
      posEnabled: item?.posEnabled ?? false,
      posPrice: item?.posPrice ?? '',
      taxRateId: item?.taxRateId ?? '',
      expiryDate: item?.expiryDate ? String(item.expiryDate).split('T')[0] : '',
      documents: item?.documents ?? [],
    },
  });

  const posEnabled = form.watch('posEnabled');

  const { isDirty } = form.formState;
  useEffect(() => { if (onDirtyChange) onDirtyChange(isDirty); }, [isDirty, onDirtyChange]);

  function handleCancel() {
    onCancel ? onCancel() : router.back();
  }

  async function onSubmit(data: InventoryItemFormData) {
    setLoading(true);
    try {
      const url = item ? `/api/inventory/${item.id}` : '/api/inventory';
      const method = item ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to save item');
      }
      const result = await res.json();
      toast.success(item ? 'Item updated' : 'Item added');

      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/${locale}/${orgSlug}/${space}/raseed/${item?.id ?? result.id}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name *</FormLabel>
              <FormControl><Input {...field} placeholder="e.g. A4 Paper Ream" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Category *</FormLabel>
              <ConfigSelect listKey="inventory_category" value={field.value} onValueChange={field.onChange} placeholder="Select category" />
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="sku" render={({ field }) => (
            <FormItem>
              <FormLabel>SKU / Code</FormLabel>
              <FormControl><Input {...field} placeholder="STAT-001" className="font-mono" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="unit" render={({ field }) => (
            <FormItem>
              <FormLabel>Unit *</FormLabel>
              <ConfigSelect listKey="inventory_unit" value={field.value} onValueChange={field.onChange} placeholder="Select unit" />
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="quantityOnHand" render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity on Hand *</FormLabel>
              <FormControl><Input type="number" min="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="minimumThreshold" render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum Threshold *</FormLabel>
              <FormControl><Input type="number" min="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="reorderQuantity" render={({ field }) => (
            <FormItem>
              <FormLabel>Reorder Quantity</FormLabel>
              <FormControl><Input type="number" min="0" {...field} placeholder="Suggested reorder amount" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="unitCost" render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Cost (JOD)</FormLabel>
              <FormControl><Input type="number" step="0.01" min="0" {...field} placeholder="0.00" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem>
              <FormLabel>Storage Location</FormLabel>
              <FormControl>
                <ConfigSelect
                  listKey="inventory_storage_location"
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select storage location"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="supplier" render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier</FormLabel>
              <FormControl><Input {...field} placeholder="Supplier name" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="expiryDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Expiry Date</FormLabel>
              <FormControl>
                <DatePicker value={field.value ?? ''} onChange={field.onChange} placeholder="Select expiry date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* Barcode — supports both manual entry and HID scanners. Enter is swallowed so a scan doesn't submit the form. */}
          <FormField control={form.control} name="barcode" render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Barcode</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <ScanBarcode size={16} aria-hidden />
                  </span>
                  <Input
                    {...field}
                    className="ps-8 font-mono"
                    placeholder="Scan or type a barcode (EAN, UPC, Code128...)"
                    autoComplete="off"
                    spellCheck={false}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.preventDefault();
                    }}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="taxRateId" render={({ field }) => (
            <FormItem>
              <FormLabel>Tax Rate</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                value={field.value || '__none__'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="No tax" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">No tax</SelectItem>
                  {taxRates.map((tr) => (
                    <SelectItem key={tr.id} value={tr.id}>
                      {tr.name} ({(tr.rate * 100).toFixed(2)}%){tr.isDefault ? ' • default' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="posEnabled" render={({ field }) => (
            <FormItem className="flex items-end gap-3">
              <div className="flex-1">
                <FormLabel>Sell in Haraka (POS)</FormLabel>
                <p className="text-xs text-gray-500">When on, this item appears in the POS register and can be sold.</p>
              </div>
              <FormControl>
                <Switch
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {posEnabled && (
            <FormField control={form.control} name="posPrice" render={({ field }) => (
              <FormItem>
                <FormLabel>POS Sale Price (JOD)</FormLabel>
                <FormControl><Input type="number" step="0.01" min="0" {...field} placeholder="0.00" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl><Textarea {...field} rows={3} placeholder="Additional notes..." /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="documents" render={({ field }) => (
          <FormItem>
            <FormLabel>Purchase receipts / invoices</FormLabel>
            <FormControl>
              <DocumentUpload
                kind="inventory-receipt"
                value={field.value ?? []}
                onChange={(refs) => field.onChange(refs)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : (item ? 'Save Changes' : 'Add Item')}</Button>
          <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
        </div>
      </form>

    </Form>
  );
}
