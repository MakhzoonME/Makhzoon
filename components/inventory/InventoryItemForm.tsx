'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/ui';
import { inventoryItemSchema, InventoryItemFormData, INVENTORY_UNITS } from '@/lib/validations/inventory.schema';
import { InventoryItem } from '@/types';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useInventoryCategories } from '@/hooks/inventory';

interface Props { item?: InventoryItem; onSuccess?: () => void; }

export function InventoryItemForm({ item, onSuccess }: Props) {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const { data: categories = [] } = useInventoryCategories();

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
    },
  });

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

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/${orgSlug}/inventory/${item?.id ?? result.id}`);
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
              <FormControl>
                <Input {...field} list="inv-categories" placeholder="e.g. Stationery" />
              </FormControl>
              <datalist id="inv-categories">
                {categories.map((c: string) => <option key={c} value={c} />)}
              </datalist>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl>
                <SelectContent>
                  {INVENTORY_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
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
              <FormControl><Input {...field} placeholder="Storage room A, Shelf 2..." /></FormControl>
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
        </div>

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl><Textarea {...field} rows={3} placeholder="Additional notes..." /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : (item ? 'Save Changes' : 'Add Item')}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </Form>
  );
}
