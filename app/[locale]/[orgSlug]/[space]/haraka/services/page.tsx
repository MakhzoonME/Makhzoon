'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader, DataTable, FormDrawer, ConfirmDialog } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { useList } from '@/hooks/lists';
import { useServices, useCreateService, useUpdateService, useDeleteService, useTaxRates } from '@/hooks/haraka';
import { createServiceSchema, type CreateServicePayload } from '@/lib/modules/haraka/services/schemas';
import { useAdminGuard, useModuleGuard, toast, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { formatCurrency } from '@/lib/utils/format';
import type { HarakaService } from '@/types';

export default function ServiceCatalogPage() {
  const { isAllowed: featureAllowed } = useModuleGuard({ featureKey: 'pos', moduleKey: 'pos' });
  const { isAllowed } = useAdminGuard('pos.manage_services');
  const { t, locale } = useT();
  const isAr = locale === 'ar';
  const { data: orgInfo } = useOrgInfo();
  const currency = orgInfo?.currency ?? 'JOD';

  const { data, isLoading } = useServices();
  const { data: taxRatesData } = useTaxRates();
  const taxRates = taxRatesData?.taxRates ?? [];
  const { data: categoryItems = [] } = useList('service_category');
  const categoryLabel = (value: string | null) => {
    if (!value) return null;
    const item = categoryItems.find((c) => c.value === value);
    return item ? (isAr ? item.labelAr || item.label : item.label) : value;
  };
  const createMut = useCreateService();
  const updateMut = useUpdateService();
  const deleteMut = useDeleteService();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<HarakaService | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<HarakaService | null>(null);

  const services = data?.items ?? [];

  const form = useForm<CreateServicePayload>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: { name: '', category: '', description: '', price: 0, taxRateId: '', active: true },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: '', category: '', description: '', price: 0, taxRateId: '', active: true });
    setDrawerOpen(true);
  }

  function openEdit(service: HarakaService) {
    setEditing(service);
    form.reset({
      name: service.name,
      category: service.category ?? '',
      description: service.description ?? '',
      price: service.price,
      taxRateId: service.taxRateId ?? '',
      active: service.active,
    });
    setDrawerOpen(true);
  }

  async function onSubmit(values: CreateServicePayload) {
    const payload = { ...values, category: values.category || null, description: values.description || null, taxRateId: values.taxRateId || null };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, body: payload });
        toast.success(t('common.updated'));
      } else {
        await createMut.mutateAsync(payload);
        toast.success(t('common.created'));
      }
      setDrawerOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    }
  }

  async function onDelete() {
    if (!confirmDelete) return;
    try {
      await deleteMut.mutateAsync(confirmDelete.id);
      toast.success(t('common.deleted'));
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.deleteFailed'));
    }
  }

  const columns: ColumnDef<HarakaService>[] = [
    { key: 'name', header: t('col.name'), render: (s) => <span className="text-sm font-medium text-gray-800">{s.name}</span> },
    { key: 'category', header: t('col.category'), render: (s) => <span className="text-xs text-gray-500">{categoryLabel(s.category) ?? '—'}</span> },
    {
      key: 'price',
      header: t('col.price'),
      render: (s) => <span className="font-mono text-sm tabular-nums">{formatCurrency(s.price, currency)}</span>,
    },
    {
      key: 'active',
      header: t('col.status'),
      render: (s) => (
        <span className={s.active ? 'text-[var(--green-700)] text-xs font-medium' : 'text-gray-400 text-xs font-medium'}>
          {s.active ? t('common.active') : t('common.inactive')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (s) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" onClick={() => openEdit(s)} aria-label={t('common.edit')}>
            <Pencil size={14} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(s)} aria-label={t('common.delete')}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  if (!featureAllowed || !isAllowed) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('services.title')}
        description={t('services.subtitle')}
        actions={
          <Button onClick={openCreate} style={{ background: 'var(--mod-haraka)' }}>
            <Plus size={16} className="me-1" /> {t('services.addService')}
          </Button>
        }
      />

      <DataTable<HarakaService>
        columns={columns}
        data={services}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
        emptyMessage={t('services.noServices')}
      />

      <FormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editing ? t('services.editService') : t('services.addService')}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('services.labelName')} *</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. Home Delivery" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('col.category')}</FormLabel>
                <ConfigSelect listKey="service_category" value={field.value ?? ''} onValueChange={field.onChange} placeholder="Select category" />
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('services.labelPrice')} *</FormLabel>
                <FormControl>
                  <Input
                    type="number" step="0.01" min="0" {...field}
                    value={field.value ?? 0}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="taxRateId" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('inventory.taxRate')}</FormLabel>
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

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('col.notes')}</FormLabel>
                <FormControl><Textarea {...field} value={field.value ?? ''} rows={3} placeholder="…" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="active" render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormControl>
                  <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div>
                  <FormLabel className="!mt-0">{t('services.labelActive')}</FormLabel>
                  <p className="text-xs text-gray-500">{t('services.activeHelp')}</p>
                </div>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {createMut.isPending || updateMut.isPending ? t('common.saving') : editing ? t('common.saveChanges') : t('common.create')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Form>
      </FormDrawer>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title={t('services.deleteTitle')}
        description={confirmDelete ? t('services.deleteDesc').replace('{name}', confirmDelete.name) : ''}
        confirmLabel={t('common.delete')}
        onConfirm={onDelete}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
