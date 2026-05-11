'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrgSlug, useT } from '@/hooks/ui';
import { warrantySchema, WarrantyFormData } from '@/lib/validations/warranty.schema';
import { Warranty } from '@/types';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { useAssets } from '@/hooks/assets';
import { useWarranties } from '@/hooks/warranties';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { UploadCloud, X } from 'lucide-react';
function AlertTriangleSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2L1.5 13h13L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
      <path d="M8 6.5v3M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function ShieldOffSVG() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <path d="M14 3L4 7v7c0 5.5 4.5 10.5 10 12 5.5-1.5 10-6.5 10-12V7L14 3z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
      <path d="M4 4l20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

interface WarrantyFormProps { warranty?: Warranty; onSuccess?: () => void; defaultAssetId?: string; onCancel?: () => void; onDirtyChange?: (dirty: boolean) => void; }

export function WarrantyForm({ warranty, onSuccess, defaultAssetId, onCancel, onDirtyChange }: WarrantyFormProps) {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { locale } = useT();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [receiptUploading, setReceiptUploading] = useState(false);

  // Fetch all active assets + all org warranties to compute availability
  const { data: assetsData, isLoading: assetsLoading } = useAssets({ status: 'Active' });
  const { data: allWarrantiesData, isLoading: warrantiesLoading } = useWarranties({ pageSize: 1000 });

  // Assets eligible for a NEW warranty = active assets with no non-expired warranty
  const availableAssets = useMemo(() => {
    const allAssets = assetsData?.items ?? [];
    if (warranty) return allAssets; // editing — show all (asset field is disabled anyway)

    const now = new Date();
    const allWarranties = allWarrantiesData?.items ?? [];
    const assetIdsWithActiveWarranty = new Set(
      allWarranties
        .filter((w) => new Date(w.endDate) >= now)
        .map((w) => w.assetId)
    );

    return allAssets.filter((a) => !assetIdsWithActiveWarranty.has(a.id));
  }, [assetsData, allWarrantiesData, warranty]);

  // When editing, ensure the current asset is in the options list even if not yet loaded
  const assetOptions = useMemo(() => {
    if (!warranty) return availableAssets;
    const existing = availableAssets.find((a) => a.id === warranty.assetId);
    if (existing) return availableAssets;
    return [
      { id: warranty.assetId, name: warranty.assetName ?? warranty.assetId },
      ...availableAssets,
    ];
  }, [availableAssets, warranty]);

  const isLoadingData = assetsLoading || warrantiesLoading;
  const noAssetsAvailable = !isLoadingData && assetOptions.length === 0 && !warranty;

  const form = useForm<WarrantyFormData>({
    resolver: zodResolver(warrantySchema),
    defaultValues: {
      assetId: warranty?.assetId ?? defaultAssetId ?? searchParams.get('assetId') ?? '',
      vendor: warranty?.vendor ?? '',
      startDate: warranty?.startDate ? new Date(warranty.startDate).toISOString().slice(0, 10) : '',
      endDate: warranty?.endDate ? new Date(warranty.endDate).toISOString().slice(0, 10) : '',
      reminder: warranty?.reminder ?? true,
      notes: warranty?.notes ?? '',
      receiptUrl: warranty?.receiptUrl ?? '',
    },
    values: warranty
      ? {
          assetId: warranty.assetId,
          vendor: warranty.vendor,
          startDate: new Date(warranty.startDate).toISOString().slice(0, 10),
          endDate: new Date(warranty.endDate).toISOString().slice(0, 10),
          reminder: warranty.reminder ?? true,
          notes: warranty.notes ?? '',
          receiptUrl: warranty.receiptUrl ?? '',
        }
      : undefined,
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

  async function onSubmit(data: WarrantyFormData) {
    setLoading(true);
    try {
      const url = warranty ? `/api/warranties/${warranty.id}` : '/api/warranties';
      const method = warranty ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          const e = await res.json();
          const msg = typeof e.error === 'string' ? e.error : (e.error?.message ?? 'Failed to save warranty');
          throw new Error(msg);
        }
        throw new Error(`Server error (${res.status})`);
      }
      toast.success(warranty ? 'Warranty updated' : 'Warranty added');
      qc.invalidateQueries({ queryKey: ['warranties'] });
      const assetId = warranty?.assetId ?? defaultAssetId;
      if (assetId) qc.invalidateQueries({ queryKey: ['assets', assetId] });
      if (onSuccess) {
        onSuccess();
      } else {
        router.back();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  // Full-page empty state — all assets already have an active warranty
  if (noAssetsAvailable) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-sm mx-auto">
        <div className="h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
          <ShieldOffSVG />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">No assets available</h3>
        <p className="text-sm text-gray-500 mb-6">
          All active assets already have a valid warranty. You can add a new warranty to an asset
          once its existing warranty expires or is deleted.
        </p>
        <Button variant="outline" onClick={() => router.push(`/${locale}/${orgSlug}/warranties`)}>
          Back to Warranties
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 max-w-lg">

        {/* Asset selector — only shows assets without an active warranty */}
        <FormField control={form.control} name="assetId" render={({ field }) => (
          <FormItem>
            <FormLabel>Asset *</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              disabled={!!warranty || !!defaultAssetId || isLoadingData}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingData ? 'Loading assets…' : 'Select asset'} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {assetOptions.length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-4 text-sm text-gray-500">
                    <AlertTriangleSVG />
                    No assets available
                  </div>
                ) : (
                  assetOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="vendor" render={({ field }) => (
          <FormItem>
            <FormLabel>Vendor *</FormLabel>
            <FormControl><Input {...field} placeholder="e.g. Dell, Apple..." /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="startDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date *</FormLabel>
              <FormControl>
                <DatePicker value={field.value} onChange={field.onChange} placeholder="Select start date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="endDate" render={({ field }) => (
            <FormItem>
              <FormLabel>End Date *</FormLabel>
              <FormControl>
                <DatePicker value={field.value} onChange={field.onChange} placeholder="Select end date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="reminder" render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <Label>Enable Reminder</Label>
            </div>
          </FormItem>
        )} />

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl><Textarea {...field} rows={3} /></FormControl>
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
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : (warranty ? 'Save Changes' : 'Add Warranty')}
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
        </div>
      </form>

    </Form>
  );
}
