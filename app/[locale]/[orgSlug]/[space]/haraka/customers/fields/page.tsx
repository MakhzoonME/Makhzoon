'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useT, useModuleGuard } from '@/hooks/ui';
import { toast } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { CustomFieldForm, type CustomFieldFormData } from '@/components/banna/CustomFieldForm';
import { useCreateCustomField, useUpdateCustomField } from '@/hooks/banna';
import type { CustomField, CustomFieldType, CustomFieldOption } from '@/types/banna.types';

/**
 * Manage custom fields on customer profiles. Deliberately its own page
 * under Haraka (not the /banna/custom-fields settings screen) — Banna
 * itself isn't released yet (no org has that feature flag), but customer
 * custom fields ship ahead of it and ride on the 'pos' feature instead.
 */
export default function CustomerFieldsPage() {
  const { isAllowed } = useModuleGuard({ featureKey: 'pos', moduleKey: 'pos' });
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const createMut = useCreateCustomField();
  const updateMut = useUpdateCustomField();

  const { data, isLoading } = useQuery<{ items: CustomField[] }>({
    queryKey: ['banna-custom-fields', 'customers'],
    queryFn: async () => {
      const res = await fetch('/api/banna/custom-fields?module=customers');
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
  });

  const fields = data?.items ?? [];
  const [editing, setEditing] = useState<CustomField | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomField | null>(null);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/banna/custom-fields/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      toast.success(t('banna.fieldDeleted'));
      qc.invalidateQueries({ queryKey: ['banna-custom-fields'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error(t('common.deleteFailed')),
  });

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  async function handleFormSubmit(data: CustomFieldFormData) {
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, data: data as unknown as Record<string, unknown> });
      toast.success(t('banna.fieldUpdated'));
    } else {
      await createMut.mutateAsync({ ...data, module: 'customers' } as unknown as Record<string, unknown>);
      toast.success(t('banna.fieldCreated'));
    }
    closeForm();
  }

  function mapDbField(raw: Record<string, unknown>): CustomField {
    return {
      id: raw.id as string,
      organizationId: raw.organization_id as string,
      module: raw.module as string,
      fieldKey: raw.field_key as string,
      type: raw.type as CustomFieldType,
      label: raw.label as string,
      labelAr: raw.label_ar as string | undefined,
      required: raw.required as boolean,
      options: raw.options as CustomFieldOption[] | undefined,
      placeholder: raw.placeholder as string | undefined,
      placeholderAr: raw.placeholder_ar as string | undefined,
      sortOrder: raw.sort_order as number,
      active: raw.is_active as boolean,
      createdAt: raw.created_at as string,
      updatedAt: raw.updated_at as string,
      spaceId: raw.space_id as string | undefined,
    };
  }

  if (!isAllowed) return null;
  if (isLoading) return <LoadingSkeleton rows={5} columns={4} />;

  return (
    <div>
      <PageHeader
        title={t('customers.customFields')}
        description={t('customers.customFieldsDesc')}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: t('nav.pos'), href: `/${params.locale}/${params.orgSlug}/${params.space}/haraka` },
          { label: t('customers.title'), href: `/${params.locale}/${params.orgSlug}/${params.space}/haraka/customers` },
          { label: t('customers.customFields') },
        ]}
        actions={
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 me-1" /> {t('banna.addField')}
          </Button>
        }
      />

      <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-page border-b border-border">
            <tr>
              <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('banna.fieldKey')}</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('banna.fieldLabel')}</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('banna.fieldType')}</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('banna.fieldRequired')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fields.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">{t('banna.noFields')}</td>
              </tr>
            )}
            {fields.map((field) => (
              <tr key={field.id} className="hover:bg-surface-page transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{field.fieldKey}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{field.label}</td>
                <td className="px-4 py-3">
                  <Badge variant="default">{field.type}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Switch checked={field.required} disabled aria-label={t('banna.fieldRequired')} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Button size="sm" variant="ghost" aria-label={t('common.edit')} onClick={() => { setEditing(mapDbField(field as unknown as Record<string, unknown>)); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={t('common.delete')} className="text-red-500" onClick={() => setDeleteTarget(field)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('banna.deleteField')}
        description={t('banna.deleteFieldDesc').replace('{label}', deleteTarget?.label ?? '')}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        loading={deleteMut.isPending}
      />

      <Dialog open={formOpen} onOpenChange={(v) => { if (!v) closeForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('banna.editField') : t('banna.addField')}</DialogTitle>
          </DialogHeader>
          <CustomFieldForm
            initial={editing ?? undefined}
            fixedModule="customers"
            onSubmit={handleFormSubmit}
            onCancel={closeForm}
            submitting={createMut.isPending || updateMut.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
