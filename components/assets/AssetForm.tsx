'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { assetSchema, AssetFormData } from '@/lib/validations/asset.schema';
import { Asset } from '@/types';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAssetCategories } from '@/hooks/useAssets';

interface AssetFormProps {
  asset?: Asset;
}

export function AssetForm({ asset }: AssetFormProps) {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const { data: categories = [] } = useAssetCategories();

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: asset?.name ?? '',
      category: asset?.category ?? '',
      status: asset?.status ?? 'Active',
      serialNumber: asset?.serialNumber ?? '',
      purchaseDate: asset?.purchaseDate ? asset.purchaseDate.toString().slice(0, 10) : '',
      purchaseCost: asset?.purchaseCost ?? '',
      assignedTo: asset?.assignedTo ?? '',
      location: asset?.location ?? '',
      notes: asset?.notes ?? '',
    },
  });

  async function onSubmit(data: AssetFormData) {
    setLoading(true);
    try {
      const url = asset ? `/api/assets/${asset.id}` : '/api/assets';
      const method = asset ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          const err = await res.json();
          const msg = typeof err.error === 'string'
            ? err.error
            : err.error?.message ?? 'Failed to save asset';
          throw new Error(msg);
        }
        throw new Error(`Server error (${res.status}) — check console for details`);
      }
      const result = await res.json();
      toast.success(asset ? 'Asset updated' : 'Asset added successfully');
      qc.invalidateQueries({ queryKey: ['assets'] });
      router.push(`/${orgSlug}/assets/${asset?.id ?? result.id}`);
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
              <FormLabel>Name *</FormLabel>
              <FormControl><Input {...field} placeholder="e.g. MacBook Pro 2024" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Category *</FormLabel>
              <FormControl>
                <Input {...field} list="categories" placeholder="e.g. Devices" />
              </FormControl>
              <datalist id="categories">
                {categories.map((c: string) => <option key={c} value={c} />)}
              </datalist>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Retired">Retired</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="serialNumber" render={({ field }) => (
            <FormItem>
              <FormLabel>Serial Number</FormLabel>
              <FormControl><Input {...field} placeholder="ABCD-1234" className="font-mono" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="purchaseDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Purchase Date</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="purchaseCost" render={({ field }) => (
            <FormItem>
              <FormLabel>Purchase Cost (JOD)</FormLabel>
              <FormControl><Input type="number" step="0.01" min="0" {...field} placeholder="0.00" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="assignedTo" render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned To</FormLabel>
              <FormControl><Input {...field} placeholder="Employee name" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl><Input {...field} placeholder="Office 1, Floor 2..." /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl><Textarea {...field} rows={4} placeholder="Additional notes..." /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : (asset ? 'Save Changes' : 'Add Asset')}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </Form>
  );
}
