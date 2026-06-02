'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrgSlug, useT } from '@/hooks/ui';
import { warrantySchema, WarrantyFormData } from '@/lib/validations/warranty.schema';
import { Warranty } from '@/types';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { DocumentUpload } from '@/components/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { useAssets } from '@/hooks/assets';
import { useInventoryItems } from '@/hooks/inventory';
import { useWarranties } from '@/hooks/warranties';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
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

interface WarrantyFormProps { warranty?: Warranty; onSuccess?: () => void; defaultAssetId?: string; defaultInventoryItemId?: string; onCancel?: () => void; onDirtyChange?: (dirty: boolean) => void; }

export function WarrantyForm({ warranty, onSuccess, defaultAssetId, defaultInventoryItemId, onCancel, onDirtyChange }: WarrantyFormProps) {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { locale } = useT();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [itemType, setItemType] = useState<'asset' | 'inventory'>(warranty?.assetId ? 'asset' : warranty?.inventoryItemId ? 'inventory' : defaultAssetId ? 'asset' : defaultInventoryItemId ? 'inventory' : 'asset');

  // Fetch all active assets + inventory items + all org warranties to compute availability
  const { data: assetsData, isLoading: assetsLoading } = useAssets({ status: 'Active' });
  const { data: inventoryData, isLoading: inventoryLoading } = useInventoryItems();
  const { data: allWarrantiesData, isLoading: warrantiesLoading } = useWarranties({ pageSize: 1000 });

  // Assets and inventory items eligible for a NEW warranty = those with no non-expired warranty
  const availableAssets = useMemo(() => {
    const allAssets = assetsData?.items ?? [];
    if (warranty) return allAssets;

    const now = new Date();
    const allWarranties = allWarrantiesData?.items ?? [];
    const idsWithActiveWarranty = new Set(
      allWarranties
        .filter((w) => new Date(w.endDate) >= now)
        .map((w) => w.assetId)
        .filter(Boolean)
    );

    return allAssets.filter((a) => !idsWithActiveWarranty.has(a.id));
  }, [assetsData, allWarrantiesData, warranty]);

  const availableInventoryItems = useMemo(() => {
    const allItems = inventoryData?.items ?? [];
    if (warranty) return allItems;

    const now = new Date();
    const allWarranties = allWarrantiesData?.items ?? [];
    const idsWithActiveWarranty = new Set(
      allWarranties
        .filter((w) => new Date(w.endDate) >= now)
        .map((w) => w.inventoryItemId)
        .filter(Boolean)
    );

    return allItems.filter((i) => !idsWithActiveWarranty.has(i.id));
  }, [inventoryData, allWarrantiesData, warranty]);

  // When editing, ensure the current asset/item is in the options list even if not yet loaded
  const assetOptions = useMemo(() => {
    if (!warranty || warranty.assetId === undefined) return availableAssets;
    const existing = availableAssets.find((a) => a.id === warranty.assetId);
    if (existing) return availableAssets;
    return [
      { id: warranty.assetId, name: warranty.assetName ?? warranty.assetId },
      ...availableAssets,
    ];
  }, [availableAssets, warranty]);

  const inventoryOptions = useMemo(() => {
    if (!warranty || warranty.inventoryItemId === undefined) return availableInventoryItems;
    const existing = availableInventoryItems.find((i) => i.id === warranty.inventoryItemId);
    if (existing) return availableInventoryItems;
    return [
      { id: warranty.inventoryItemId, name: warranty.inventoryItemName ?? warranty.inventoryItemId },
      ...availableInventoryItems,
    ];
  }, [availableInventoryItems, warranty]);

  const isLoadingData = assetsLoading || inventoryLoading || warrantiesLoading;
  const noItemsAvailable = !isLoadingData && assetOptions.length === 0 && inventoryOptions.length === 0 && !warranty;

  const form = useForm<WarrantyFormData>({
    resolver: zodResolver(warrantySchema),
    defaultValues: {
      assetId: warranty?.assetId ?? defaultAssetId ?? (itemType === 'asset' ? searchParams.get('assetId') ?? '' : ''),
      inventoryItemId: warranty?.inventoryItemId ?? defaultInventoryItemId ?? (itemType === 'inventory' ? searchParams.get('inventoryItemId') ?? '' : ''),
      vendor: warranty?.vendor ?? '',
      startDate: warranty?.startDate ? new Date(warranty.startDate).toISOString().slice(0, 10) : '',
      endDate: warranty?.endDate ? new Date(warranty.endDate).toISOString().slice(0, 10) : '',
      reminder: warranty?.reminder ?? true,
      notes: warranty?.notes ?? '',
      documents: warranty?.documents ?? [],
    },
    values: warranty
      ? {
          assetId: warranty.assetId,
          inventoryItemId: warranty.inventoryItemId,
          vendor: warranty.vendor,
          startDate: new Date(warranty.startDate).toISOString().slice(0, 10),
          endDate: new Date(warranty.endDate).toISOString().slice(0, 10),
          reminder: warranty.reminder ?? true,
          notes: warranty.notes ?? '',
          documents: warranty.documents ?? [],
        }
      : undefined,
  });

  const { isDirty } = form.formState;
  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  function handleCancel() {
    onCancel ? onCancel() : router.back();
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
      const itemId = warranty?.inventoryItemId ?? defaultInventoryItemId;
      if (assetId) qc.invalidateQueries({ queryKey: ['assets', assetId] });
      if (itemId) qc.invalidateQueries({ queryKey: ['inventory', itemId] });
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

  // Full-page empty state — all assets and inventory items already have an active warranty
  if (noItemsAvailable) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-sm mx-auto">
        <div className="h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
          <ShieldOffSVG />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">No items available</h3>
        <p className="text-sm text-gray-500 mb-6">
          All active assets and inventory items already have a valid warranty. You can add a new warranty
          once an existing warranty expires or is deleted.
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 max-w-lg">

        {/* Item type selector */}
        {!warranty && !defaultAssetId && !defaultInventoryItemId && (
          <FormItem>
            <FormLabel>Warranty for *</FormLabel>
            <Select value={itemType} onValueChange={(v) => setItemType(v as 'asset' | 'inventory')} disabled={isLoadingData}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="asset">Asset</SelectItem>
                <SelectItem value="inventory">Inventory Item</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}

        {/* Asset selector — only shows assets without an active warranty */}
        {itemType === 'asset' && (
          <FormField control={form.control} name="assetId" render={({ field }) => {
            const lockedAssetId = warranty?.assetId ?? defaultAssetId;
            if (lockedAssetId) {
              const lockedName =
                warranty?.assetName ??
                assetOptions.find((a) => a.id === lockedAssetId)?.name ??
                lockedAssetId;
              return (
                <FormItem>
                  <FormLabel>Asset *</FormLabel>
                  <div className="flex h-9 w-full items-center rounded-md border border-border bg-surface-page px-3 py-2 text-[14px] text-gray-900">
                    {lockedName}
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }
            return (
              <FormItem>
                <FormLabel>Asset *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isLoadingData}
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
            );
          }} />
        )}

        {/* Inventory item selector */}
        {itemType === 'inventory' && (
          <FormField control={form.control} name="inventoryItemId" render={({ field }) => {
            const lockedItemId = warranty?.inventoryItemId ?? defaultInventoryItemId;
            if (lockedItemId) {
              const lockedName =
                warranty?.inventoryItemName ??
                inventoryOptions.find((i) => i.id === lockedItemId)?.name ??
                lockedItemId;
              return (
                <FormItem>
                  <FormLabel>Inventory Item *</FormLabel>
                  <div className="flex h-9 w-full items-center rounded-md border border-border bg-surface-page px-3 py-2 text-[14px] text-gray-900">
                    {lockedName}
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }
            return (
              <FormItem>
                <FormLabel>Inventory Item *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isLoadingData}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingData ? 'Loading items…' : 'Select item'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {inventoryOptions.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-4 text-sm text-gray-500">
                        <AlertTriangleSVG />
                        No items available
                      </div>
                    ) : (
                      inventoryOptions.map((i) => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            );
          }} />
        )}

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

        <FormField control={form.control} name="documents" render={({ field }) => (
          <FormItem>
            <FormLabel>Warranty papers</FormLabel>
            <FormControl>
              <DocumentUpload
                kind="warranty-document"
                value={field.value ?? []}
                onChange={(refs) => field.onChange(refs)}
              />
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
