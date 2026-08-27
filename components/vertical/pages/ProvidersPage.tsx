'use client';
import { useVertical } from '@/components/vertical/VerticalProvider';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Phone, ToggleLeft, ToggleRight, CalendarClock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { useStaff, useCreateStaff, useUpdateStaff, useDeleteStaff } from '@/hooks/haraka';
import { toast, useModuleGuard, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { cn } from '@/lib/utils/cn';
import { staffSchema, type StaffFormData } from '@/lib/modules/haraka/staff/schemas';
import { STAFF_CAPABILITIES, type HarakaStaff, type StaffCapability } from '@/types';
import type { MessageKey } from '@/locales/messages';

const EMPTY: StaffFormData = {
  name: '',
  phone: null,
  notes: null,
  capabilities: ['delivery'],
  isActive: true,
};

const CAPABILITY_LABEL_KEY: Record<StaffCapability, MessageKey> = {
  delivery: 'staff.capabilityDelivery',
  service_job: 'staff.capabilityServiceJob',
  appointment_provider: 'staff.capabilityAppointment',
};

function StaffFormDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<StaffFormData>;
  onSave: (values: StaffFormData) => Promise<void>;
  saving: boolean;
}) {
  const { colorVar } = useVertical();
  const { t } = useT();
  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: { ...EMPTY, ...initial },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial?.name ? t('staff.editStaff') : t('staff.addStaff')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)}>
            <DialogBody className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('staff.labelName')} *</FormLabel>
                    <FormControl>
                      <Input autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('staff.labelPhone')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+962 7…"
                        inputMode="tel"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Capability tags decide which modules can assign this person. */}
              <FormField
                control={form.control}
                name="capabilities"
                render={({ field }) => {
                  const selected = (field.value ?? []) as StaffCapability[];
                  return (
                    <FormItem>
                      <FormLabel>{t('staff.labelCapabilities')}</FormLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {STAFF_CAPABILITIES.map((cap) => {
                          const on = selected.includes(cap);
                          return (
                            <button
                              key={cap}
                              type="button"
                              aria-pressed={on}
                              onClick={() =>
                                field.onChange(
                                  on ? selected.filter((c) => c !== cap) : [...selected, cap],
                                )
                              }
                              className={cn(
                                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                                on
                                  ? 'border-transparent text-white'
                                  : 'border-border text-gray-500 hover:border-gray-300',
                              )}
                              style={on ? { background: colorVar } : undefined}
                            >
                              {t(CAPABILITY_LABEL_KEY[cap])}
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('col.notes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function ProvidersPage() {
  const { vertical, featureKey, permModule, basePath } = useVertical();
  const { isAllowed } = useModuleGuard({ featureKey, moduleKey: permModule, harakaAddOn: vertical === 'haraka' ? 'deliveryAgents' : undefined });
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const router = useRouter();
  const { data: orgInfo } = useOrgInfo();
  const { t } = useT();
  const base = basePath;

  const { data, isLoading } = useStaff();
  const staff = data?.items ?? [];

  const createMut = useCreateStaff();
  const updateMut = useUpdateStaff();
  const deleteMut = useDeleteStaff();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HarakaStaff | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HarakaStaff | null>(null);

  if (!isAllowed) return null;

  async function handleCreate(values: StaffFormData) {
    try {
      await createMut.mutateAsync(values);
      toast.success(t('common.created'));
      setAddOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    }
  }

  async function handleEdit(values: StaffFormData) {
    if (!editTarget) return;
    try {
      await updateMut.mutateAsync({ id: editTarget.id, body: values });
      toast.success(t('common.updated'));
      setEditTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    }
  }

  async function handleToggleActive(person: HarakaStaff) {
    try {
      await updateMut.mutateAsync({ id: person.id, body: { isActive: !person.isActive } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.saveFailed'));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast.success(t('common.deleted'));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.deleteFailed'));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('staff.title')}
        description={t('staff.subtitle')}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: 'Haraka', href: base },
          { label: t('staff.title') },
        ]}
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 me-1" strokeWidth={1.75} />
            {t('staff.addStaff')}
          </Button>
        }
      />

      <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-page">
                <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('staff.labelName')}</th>
                <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('staff.labelPhone')}</th>
                <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('staff.labelCapabilities')}</th>
                <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('col.status')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-surface-page rounded animate-pulse" style={{ width: j === 0 ? '120px' : '80px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                    {t('staff.noStaff')}
                  </td>
                </tr>
              ) : staff.map((person) => (
                <tr
                  key={person.id}
                  className="hover:bg-surface-page transition-colors cursor-pointer"
                  onClick={() => router.push(`${base}/staff/${person.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{person.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {person.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-gray-400" strokeWidth={1.75} />
                        {person.phone}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {person.capabilities.length === 0 ? (
                        <span className="text-gray-300">—</span>
                      ) : person.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-page text-gray-600 border border-border"
                        >
                          {t(CAPABILITY_LABEL_KEY[cap] ?? 'staff.labelCapabilities')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(person)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors',
                        person.isActive
                          ? 'bg-[var(--green-100)] text-[var(--green-700)] hover:bg-[var(--green-200)]'
                          : 'bg-surface-page text-gray-500 hover:bg-gray-100',
                      )}
                    >
                      {person.isActive
                        ? <><ToggleRight className="h-3 w-3" strokeWidth={1.75} /> {t('common.active')}</>
                        : <><ToggleLeft className="h-3 w-3" strokeWidth={1.75} /> {t('common.inactive')}</>}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-end" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {/* Working hours only mean something for appointment providers. */}
                      {person.capabilities.includes('appointment_provider') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={t('staff.availability')}
                          title={t('staff.availability')}
                          className="text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          onClick={() => router.push(`${base}/staff/${person.id}/availability`)}
                        >
                          <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={t('common.edit')}
                        className="text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        onClick={() => setEditTarget(person)}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={t('common.delete')}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        onClick={() => setDeleteTarget(person)}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <StaffFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={handleCreate}
        saving={createMut.isPending}
      />

      {editTarget && (
        <StaffFormDialog
          key={editTarget.id}
          open={!!editTarget}
          onOpenChange={(v) => !v && setEditTarget(null)}
          initial={{
            name: editTarget.name,
            phone: editTarget.phone,
            notes: editTarget.notes,
            capabilities: editTarget.capabilities,
            isActive: editTarget.isActive,
          }}
          onSave={handleEdit}
          saving={updateMut.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t('staff.deleteTitle')}
        description={t('staff.deleteDesc').replace('{name}', deleteTarget?.name ?? '')}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
