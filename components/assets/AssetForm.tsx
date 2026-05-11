'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useOrgSlug, useT } from '@/hooks/ui';
import { assetSchema, AssetFormData } from '@/lib/validations/asset.schema';
import { Asset } from '@/types';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAssetCategories } from '@/hooks/assets';
import { useOrgConfig } from '@/hooks/org';
import { useAuthStore } from '@/store/auth.store';
import { UploadCloud, X } from 'lucide-react';
interface AssetFormProps {
  asset?: Asset;
  onSuccess?: () => void;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function AssetForm({ asset, onSuccess, onCancel, onDirtyChange }: AssetFormProps) {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { locale } = useT();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const { user } = useAuthStore();
  const { data: usedCategories = [] } = useAssetCategories();
  const { data: orgConfig } = useOrgConfig(user?.organizationId ?? undefined);

  // Merge categories from org config with categories already in use, dedupe.
  const categoryOptions = Array.from(
    new Set([
      ...(orgConfig?.categories.map((c) => c.name) ?? []),
      ...(usedCategories as string[]),
    ]),
  ).sort((a, b) => a.localeCompare(b));
  const locationOptions = orgConfig?.locations.map((l) => l.name) ?? [];

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
      receiptUrl: asset?.receiptUrl ?? '',
    },
  });

  const { isDirty } = form.formState;
  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  function handleCancel() {
    onCancel ? onCancel() : router.back();
  }

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error('Image must be smaller than 3 MB'); return; }
    setReceiptUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'receipt', contentType: file.type, size: file.size }),
      });
      if (!res.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, publicUrl } = await res.json();
      const put = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!put.ok) throw new Error('Failed to upload image');
      form.setValue('receiptUrl', publicUrl, { shouldDirty: true });
      toast.success('Receipt uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setReceiptUploading(false);
      e.target.value = '';
    }
  }

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
      if (asset?.id) qc.invalidateQueries({ queryKey: ['assets', asset.id] });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/${locale}/${orgSlug}/assets/${asset?.id ?? result.id}`);
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
                {categoryOptions.map((c) => <option key={c} value={c} />)}
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
              <FormControl>
                <DatePicker value={field.value} onChange={field.onChange} placeholder="Select purchase date" />
              </FormControl>
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
              <FormControl>
                <Input {...field} list="locations" placeholder="Office 1, Floor 2..." />
              </FormControl>
              <datalist id="locations">
                {locationOptions.map((l) => <option key={l} value={l} />)}
              </datalist>
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

        <FormField control={form.control} name="receiptUrl" render={({ field }) => (
          <FormItem>
            <FormLabel>Receipt Image</FormLabel>
            <FormControl>
              <div className="space-y-3">
                {field.value && (
                  <div className="relative inline-block">
                    <img src={field.value} alt="Receipt" className="rounded-md border border-gray-200 dark:border-gray-700 max-h-48 object-contain" />
                    <button
                      type="button"
                      onClick={() => form.setValue('receiptUrl', '', { shouldDirty: true })}
                      className="absolute -top-1.5 -right-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-0.5 shadow-sm hover:bg-gray-50"
                    >
                      <X className="h-3 w-3 text-gray-500" />
                    </button>
                  </div>
                )}
                <label className={`flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-md px-4 py-3 hover:border-gray-400 dark:hover:border-gray-500 transition-colors w-fit ${receiptUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <UploadCloud className="h-4 w-4 shrink-0" />
                  <span>{receiptUploading ? 'Uploading…' : (field.value ? 'Replace image' : 'Upload receipt image')}</span>
                  <input type="file" accept="image/*" className="sr-only" onChange={handleReceiptUpload} disabled={receiptUploading} />
                </label>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : (asset ? 'Save Changes' : 'Add Asset')}</Button>
          <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
        </div>
      </form>

    </Form>
  );
}
