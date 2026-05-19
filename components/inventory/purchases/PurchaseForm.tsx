'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useOrgSlug, useT, toast } from '@/hooks/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { createPurchaseSchema, type PurchaseFormData } from '@/lib/modules/inventory/purchases/schemas';
import { useCreatePurchase, useUpdatePurchase } from '@/hooks/inventory';
import type { Purchase } from '@/types';
import { PurchaseLinesEditor } from './PurchaseLinesEditor';

interface Props {
  purchase?: Purchase;
  onSuccess?: (id: string) => void;
  onCancel?: () => void;
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function PurchaseForm({ purchase, onSuccess, onCancel }: Props) {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { locale } = useT();
  const [loading, setLoading] = useState(false);

  const createMut = useCreatePurchase();
  const updateMut = useUpdatePurchase(purchase?.id ?? '');

  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(createPurchaseSchema),
    defaultValues: {
      supplierName: purchase?.supplierName ?? '',
      supplierContact: purchase?.supplierContact ?? '',
      invoiceNumber: purchase?.invoiceNumber ?? '',
      invoiceDate: purchase?.invoiceDate ?? new Date(),
      notes: purchase?.notes ?? '',
      updateItemUnitCost: purchase?.updateItemUnitCost ?? false,
      lines: purchase?.lines.map((l) => ({
        itemId: l.itemId,
        itemName: l.itemName,
        sku: l.sku,
        barcode: l.barcode ?? '',
        quantity: l.quantity,
        unitCost: l.unitCost,
        taxRateId: l.taxRateId ?? '',
        notes: l.notes,
      })) ?? [],
    },
  });

  // The Zod schema doesn't accept Date for `invoiceDate` directly because the form uses an input[type=date].
  // We coerce to Date in onSubmit.
  const [invoiceDateStr, setInvoiceDateStr] = useState<string>(toISODate(purchase?.invoiceDate ?? new Date()));

  async function onSubmit(values: PurchaseFormData) {
    setLoading(true);
    try {
      const payload: PurchaseFormData = {
        ...values,
        invoiceDate: new Date(invoiceDateStr),
      };
      let id: string;
      if (purchase) {
        await updateMut.mutateAsync(payload);
        id = purchase.id;
        toast.success('Purchase updated');
      } else {
        const res = await createMut.mutateAsync(payload);
        id = res.id;
        toast.success('Purchase created as draft');
      }
      if (onSuccess) onSuccess(id);
      else router.push(`/${locale}/${orgSlug}/raseed/purchases/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save purchase');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="supplierName" render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier *</FormLabel>
              <FormControl><Input {...field} placeholder="Supplier name" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="supplierContact" render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier contact</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ''} placeholder="Phone, email, etc." /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
            <FormItem>
              <FormLabel>Invoice number</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ''} placeholder="INV-2026-0001" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormItem>
            <FormLabel>Invoice date *</FormLabel>
            <FormControl>
              <Input
                type="date"
                value={invoiceDateStr}
                onChange={(e) => setInvoiceDateStr(e.target.value)}
                required
              />
            </FormControl>
          </FormItem>
        </div>

        <FormField
          control={form.control}
          name="updateItemUnitCost"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormControl>
                <Switch checked={!!field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div>
                <FormLabel className="!mt-0">Update item last-cost on receive</FormLabel>
                <p className="text-xs text-gray-500">
                  When on, each item&apos;s unit cost and supplier are updated from this purchase when received.
                </p>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Controller
          control={form.control}
          name="lines"
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <div className="font-medium">Line items *</div>
              <PurchaseLinesEditor value={field.value ?? []} onChange={field.onChange} />
              {fieldState.error && (
                <p className="text-sm text-red-600">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ''} rows={2} placeholder="Internal notes about this purchase" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : purchase ? 'Save changes' : 'Save as draft'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel ?? (() => router.back())}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
