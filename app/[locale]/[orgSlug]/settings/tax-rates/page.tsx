'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader, DataTable, FormDrawer, ConfirmDialog } from '@/components/shared';
import type { ColumnDef } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useTaxRates, useCreateTaxRate, useUpdateTaxRate, useDeleteTaxRate } from '@/hooks/haraka';
import { taxRateSchema, type TaxRateFormData } from '@/lib/modules/haraka/tax/schemas';
import { toast, useAdminGuard, useT } from '@/hooks/ui';
import { useAuthStore } from '@/hooks/ui';
import type { TaxRate } from '@/types';

export default function TaxRatesPage() {
  const { isAllowed } = useAdminGuard('settings.taxRates');
  const { t } = useT();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useTaxRates();
  const createMut = useCreateTaxRate();
  const updateMut = useUpdateTaxRate();
  const deleteMut = useDeleteTaxRate();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TaxRate | null>(null);

  const rates = data?.taxRates ?? [];

  const form = useForm<TaxRateFormData>({
    resolver: zodResolver(taxRateSchema),
    defaultValues: { name: '', rate: 0, isDefault: false },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: '', rate: 0, isDefault: false });
    setDrawerOpen(true);
  }

  function openEdit(rate: TaxRate) {
    setEditing(rate);
    form.reset({ name: rate.name, rate: rate.rate, isDefault: rate.isDefault });
    setDrawerOpen(true);
  }

  async function onSubmit(values: TaxRateFormData) {
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, patch: values });
        toast.success(t('common.updated'));
      } else {
        await createMut.mutateAsync(values);
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

  const columns: ColumnDef<TaxRate>[] = [
    { key: 'name', header: t('col.name'), sortable: true, render: (r) => r.name },
    {
      key: 'rate',
      header: t('col.rate'),
      sortable: true,
      render: (r) => `${(r.rate * 100).toFixed(2)}%`,
    },
    {
      key: 'isDefault',
      header: t('col.default'),
      render: (r) => (r.isDefault ? t('common.yes') : '—'),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" onClick={() => openEdit(r)} aria-label={t('common.edit')}>
            <Pencil size={14} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(r)} aria-label={t('common.delete')}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  if (!isAllowed) return null;

  return (
    <div className="p-6">
      <PageHeader
        title={t('nav.taxRates')}
        description={t('taxRates.subtitle')}
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} className="me-1" /> {t('taxRates.addTaxRate')}
          </Button>
        }
      />

      <DataTable<TaxRate>
        columns={columns}
        data={rates}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        emptyMessage={t('taxRates.noTaxRates')}
      />

      <FormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editing ? t('taxRates.editTaxRate') : t('taxRates.addTaxRate')}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('taxRates.nameRequired')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="VAT 16%" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('taxRates.rateLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      max="1"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel className="!mt-0">{t('taxRates.defaultTaxRate')}</FormLabel>
                    <p className="text-xs text-gray-500">
                      {t('taxRates.defaultHelp')}
                    </p>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

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
        title={t('taxRates.deleteTitle')}
        description={
          confirmDelete
            ? t('taxRates.deleteDesc').replace('{name}', confirmDelete.name)
            : ''
        }
        confirmLabel={t('common.delete')}
        onConfirm={onDelete}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
