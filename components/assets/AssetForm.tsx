'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useOrgSlug, useSpace, useT } from '@/hooks/ui';
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
import { useAssignableUsers } from '@/hooks/users';
import type { OrgUser } from '@/types';

interface AssetFormProps {
  asset?: Asset;
  onSuccess?: () => void;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h3 className="text-sm font-semibold text-gray-900 whitespace-nowrap">{title}</h3>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function LoaderSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="animate-spin">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.8" />
      <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function AssetForm({ asset, onSuccess, onCancel, onDirtyChange }: AssetFormProps) {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const { t, locale } = useT();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
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
      name:         asset?.name         ?? '',
      category:     asset?.category     ?? '',
      status:       asset?.status       ?? 'Active',
      serialNumber: asset?.serialNumber ?? '',
      purchaseDate: asset?.purchaseDate ? asset.purchaseDate.toString().slice(0, 10) : '',
      purchaseCost: asset?.purchaseCost ?? '',
      assignedTo:   asset?.assignedTo   ?? '',
      location:     asset?.location     ?? '',
      notes:        asset?.notes        ?? '',
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
      const url    = asset ? `/api/assets/${asset.id}` : '/api/assets';
      const method = asset ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('application/json')) {
          const err = await res.json();
          const msg = typeof err.error === 'string'
            ? err.error
            : err.error?.message ?? 'Failed to save asset';
          throw new Error(msg);
        }
        throw new Error(`Server error (${res.status})`);
      }
      const result = await res.json();
      toast.success(asset ? t('assets.saveChanges') : t('assets.addAsset'));

      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['asset-categories'] });
      if (asset?.id) qc.invalidateQueries({ queryKey: ['assets', asset.id] });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/${locale}/${orgSlug}/${space}/usool/${asset?.id ?? result.id}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* ── Section 1: Basic information ─────────────────────────── */}
        <div>
          <SectionHeader title={t('assets.basicInfo')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{t('col.name')} *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t('assets.namePlaceholder')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('col.category')} *</FormLabel>
                <ConfigSelect
                  listKey="asset_category"
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={t('common.selectPlaceholder')}
                />
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('col.status')} *</FormLabel>
                <ConfigSelect
                  listKey="asset_status"
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={t('common.selectPlaceholder')}
                />
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="serialNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('col.serialNumber')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="C02V8K2RHV29" className="font-mono" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('col.location')}</FormLabel>
                <ConfigSelect
                  listKey="location"
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={t('common.selectPlaceholder')}
                />
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* ── Section 2: Purchase & assignment ─────────────────────── */}
        <div>
          <SectionHeader title={t('assets.purchaseAssignment')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="purchaseDate" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('col.purchaseDate')}</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} placeholder={t('col.purchaseDate')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="purchaseCost" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('col.cost')} (JOD)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} placeholder={t('assets.costPlaceholder')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="assignedTo" render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{t('col.assignedTo')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('assets.unassigned')} />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.length === 0 && (
                      <SelectItem value="__none" disabled>{t('assets.noUsersFound')}</SelectItem>
                    )}
                    {assignableUsers.map((u: OrgUser) => (
                      <SelectItem key={u.id} value={u.displayName}>{u.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Notes — full width below the grid */}
          <div className="mt-4">
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('col.notes')}</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={4} placeholder={t('assets.notesPlaceholder')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Button
            type="submit"
            disabled={loading}
            className="cursor-pointer transition-colors duration-150"
          >
            {loading
              ? <span className="inline-flex items-center gap-2"><LoaderSVG />{t('common.saving')}</span>
              : (asset ? t('assets.saveChanges') : t('assets.addAsset'))}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="cursor-pointer transition-colors duration-150"
          >
            {t('common.cancel')}
          </Button>
        </div>

      </form>
    </Form>
  );
}
