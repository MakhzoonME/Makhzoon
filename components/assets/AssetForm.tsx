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
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useAssetCategories } from '@/hooks/assets';
import { useOrgConfig } from '@/hooks/org';
import { useAssignableUsers } from '@/hooks/users';
import type { OrgUser } from '@/types';
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
  const user = useAuthStore((s) => s.user);
  const { data: usedCategories = [] } = useAssetCategories();
  const { data: orgConfig } = useOrgConfig(user?.organizationId ?? undefined);
  const categories = Array.from(
    new Set([
      ...(orgConfig?.categories.map((c) => c.name) ?? []),
      ...usedCategories,
    ])
  ).sort((a, b) => a.localeCompare(b));
  const { data: allUsers = [] } = useAssignableUsers();
  function canAccessAssets(u: OrgUser) {
    const ADMIN_ROLES = new Set(['admin', 'org_owner', 'super_admin', 'makhzoon_admin', 'makhzoon_support']);
    if (ADMIN_ROLES.has(u.role)) return true;
    return u.permissions?.assets?.view === true;
  }
  const assignableUsers = allUsers.filter(canAccessAssets);

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

  const { isDirty } = form.formState;
  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  function handleCancel() {
    onCancel ? onCancel() : router.back();
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
        router.push(`/${locale}/${orgSlug}/usool/${asset?.id ?? result.id}`);
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
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.length === 0 && (
                    <SelectItem value="__none" disabled>No categories found</SelectItem>
                  )}
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status *</FormLabel>
              <ConfigSelect listKey="asset_status" value={field.value} onValueChange={field.onChange} placeholder="Select status" />
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
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {assignableUsers.length === 0 && (
                    <SelectItem value="__none" disabled>No users found</SelectItem>
                  )}
                  {assignableUsers.map((u: OrgUser) => (
                    <SelectItem key={u.id} value={u.displayName}>{u.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <ConfigSelect listKey="location" value={field.value} onValueChange={field.onChange} placeholder="Select location" />
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
          <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
        </div>
      </form>

    </Form>
  );
}
