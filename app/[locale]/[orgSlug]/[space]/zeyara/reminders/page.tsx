'use client';

// Reminder settings. Deliberately opt-in and blunt about the prerequisite:
// nothing sends until the org's WhatsApp templates are approved by Meta, and
// a clinic that doesn't know that will file a bug instead of a template.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { VerticalProvider, useVertical } from '@/components/vertical/VerticalProvider';
import { useModuleGuard, toast, useT } from '@/hooks/ui';
import { useAuthStore } from '@/store/auth.store';
import { hasPermission } from '@/lib/permissions';

interface ReminderConfig {
  enabled: boolean;
  hoursBefore: number;
  followUpEnabled: boolean;
}

function RemindersSettings() {
  const { featureKey, permModule, colorVar } = useVertical();
  const { isAllowed } = useModuleGuard({ featureKey, moduleKey: permModule });
  const { t } = useT();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = !!user && hasPermission(user, 'zeyara', 'staffManage');

  const { data, isLoading } = useQuery<{ config: ReminderConfig }>({
    queryKey: ['zeyara', 'reminder-config'],
    queryFn: async () => {
      const res = await fetch('/api/zeyara/reminder-config');
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
  });

  const saveMut = useMutation({
    mutationFn: async (body: ReminderConfig) => {
      const res = await fetch('/api/zeyara/reminder-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: () => {
      toast.success(t('common.saved'));
      qc.invalidateQueries({ queryKey: ['zeyara', 'reminder-config'] });
    },
    onError: () => toast.error(t('common.saveFailed')),
  });

  if (!isAllowed) return null;
  if (isLoading || !data) {
    return (
      <div className="p-6">
        <div className="h-8 w-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Keyed on the loaded values so the form's initial state comes from props
  // rather than an effect that syncs after the first paint.
  return (
    <ReminderForm
      key={JSON.stringify(data.config)}
      initial={data.config}
      canEdit={canEdit}
      colorVar={colorVar}
      saving={saveMut.isPending}
      onSave={(v) => saveMut.mutate(v)}
    />
  );
}

function ReminderForm({
  initial,
  canEdit,
  colorVar,
  saving,
  onSave,
}: {
  initial: ReminderConfig;
  canEdit: boolean;
  colorVar: string;
  saving: boolean;
  onSave: (v: ReminderConfig) => void;
}) {
  const { t } = useT();
  const [form, setForm] = useState<ReminderConfig>(initial);

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={t('zeyara.remindersTitle')}
        description={t('zeyara.remindersSubtitle')}
      />

      <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600 mt-0.5" strokeWidth={1.75} />
        <p className="text-sm text-amber-900">{t('zeyara.remindersTemplateWarning')}</p>
      </div>

      <div className="space-y-5 rounded-xl border border-border bg-surface-card p-5">
        <div className="flex items-center gap-3">
          <BellRing className="h-4 w-4" strokeWidth={1.75} style={{ color: colorVar }} />
          <div className="flex-1">
            <Label className="font-medium">{t('zeyara.remindersEnable')}</Label>
            <p className="text-xs text-gray-500">{t('zeyara.remindersEnableHelp')}</p>
          </div>
          <Switch
            checked={form.enabled}
            disabled={!canEdit}
            onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
          />
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Label className="flex-1 font-normal text-sm">{t('zeyara.remindersHoursBefore')}</Label>
          <Input
            type="number"
            min={1}
            max={168}
            className="max-w-[120px]"
            disabled={!canEdit || !form.enabled}
            value={form.hoursBefore}
            onChange={(e) =>
              setForm((f) => ({ ...f, hoursBefore: Number(e.target.value) || 24 }))
            }
          />
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <div className="flex-1">
            <Label className="font-normal text-sm">{t('zeyara.remindersFollowUp')}</Label>
            <p className="text-xs text-gray-500">{t('zeyara.remindersFollowUpHelp')}</p>
          </div>
          <Switch
            checked={form.followUpEnabled}
            disabled={!canEdit || !form.enabled}
            onCheckedChange={(v) => setForm((f) => ({ ...f, followUpEnabled: v }))}
          />
        </div>

        {canEdit && (
          <div className="border-t border-border pt-4">
            <Button
              onClick={() => onSave(form)}
              disabled={saving}
              style={{ background: colorVar }}
            >
              {saving ? t('common.saving') : t('common.saveChanges')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ZeyaraRemindersPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <RemindersSettings />
    </VerticalProvider>
  );
}
