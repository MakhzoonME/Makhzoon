'use client';
import { useState, useEffect } from 'react';
import { useCustomFieldValues, useSaveCustomFieldValues } from '@/hooks/banna';
import { isFieldVisible, type ConditionEvalEntry } from '@/lib/modules/banna/condition-eval';
import type { CustomFieldWithValue, CustomFieldRecordType, UpsertCustomFieldValueInput, PlateReaderEntry } from '@/types/banna.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/ui/combobox';
import { useT, toast } from '@/hooks/ui';
import { Loader2, Camera, X, Plus } from 'lucide-react';
import { PlateCaptureDialog } from '@/components/haraka/PlateCaptureDialog';
import { useOcrPlate } from '@/hooks/haraka';

interface Props {
  recordType: CustomFieldRecordType;
  recordId: string;
}

/** Repeatable vehicle-plate list — one customer can have several vehicles.
 *  Each row's plate can be typed or captured via the camera/OCR reader,
 *  same flow as service-job intake. Saved rows sync to the real
 *  haraka_service_vehicles table server-side (see BannaValuesService). */
function PlateReaderFieldInput({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const entries: PlateReaderEntry[] = Array.isArray(value) ? (value as PlateReaderEntry[]) : [];
  const [captureIndex, setCaptureIndex] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const ocrMut = useOcrPlate();

  function updateEntry(i: number, patch: Partial<PlateReaderEntry>) {
    onChange(entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }
  function addEntry() {
    onChange([...entries, { plateNumber: '' }]);
  }
  function removeEntry(i: number) {
    onChange(entries.filter((_, idx) => idx !== i));
  }

  async function handleCaptured(dataUri: string) {
    if (captureIndex === null) return;
    const i = captureIndex;
    try {
      const result = await ocrMut.mutateAsync(dataUri);
      if (result.plateNumber) {
        updateEntry(i, { plateNumber: result.plateNumber });
      } else {
        toast.error('Could not read the plate — enter it manually');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Plate recognition failed');
    }
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <div key={i} className="rounded-lg border border-border p-2.5 space-y-2">
          <div className="flex gap-1.5">
            <Input
              value={entry.plateNumber}
              onChange={(e) => updateEntry(i, { plateNumber: e.target.value.toUpperCase() })}
              placeholder="Plate number"
              className="h-8 text-sm font-mono tracking-wider"
            />
            <Button
              type="button" size="sm" variant="outline" className="h-8 px-2.5 flex-shrink-0"
              onClick={() => { setCaptureIndex(i); setDialogOpen(true); }}
              aria-label="Capture plate"
            >
              <Camera className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button" size="sm" variant="ghost" className="h-8 px-2 flex-shrink-0 text-red-500"
              onClick={() => removeEntry(i)}
              aria-label="Remove vehicle"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Input value={entry.make ?? ''} onChange={(e) => updateEntry(i, { make: e.target.value })} placeholder="Make" className="h-7 text-xs" />
            <Input value={entry.model ?? ''} onChange={(e) => updateEntry(i, { model: e.target.value })} placeholder="Model" className="h-7 text-xs" />
            <Input value={entry.color ?? ''} onChange={(e) => updateEntry(i, { color: e.target.value })} placeholder="Color" className="h-7 text-xs" />
          </div>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={addEntry}>
        <Plus className="h-3.5 w-3.5 me-1" /> Add vehicle
      </Button>
      <PlateCaptureDialog open={dialogOpen} onOpenChange={setDialogOpen} onCaptured={handleCaptured} />
    </div>
  );
}

export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomFieldWithValue;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const { locale } = useT();
  const label = (locale === 'ar' && field.labelAr) ? field.labelAr : field.label;
  const placeholder = (locale === 'ar' && field.placeholderAr) ? field.placeholderAr : (field.placeholder ?? '');

  if (field.type === 'plate_reader') {
    return (
      <div className="space-y-1 sm:col-span-2">
        <Label className="text-xs font-medium text-gray-600">
          {label}
          {field.required && <span className="text-red-500 ms-0.5">*</span>}
        </Label>
        <PlateReaderFieldInput value={value} onChange={onChange} />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-gray-600">
        {label}
        {field.required && <span className="text-red-500 ms-0.5">*</span>}
      </Label>

      {field.type === 'text' && (
        <Input
          value={typeof value === 'string' ? value : ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-sm"
        />
      )}

      {field.type === 'number' && (
        <Input
          type="number"
          value={typeof value === 'number' ? value : ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className="h-8 text-sm"
        />
      )}

      {field.type === 'date' && (
        <Input
          type="date"
          value={typeof value === 'string' ? value.slice(0, 10) : ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="h-8 text-sm"
        />
      )}

      {field.type === 'boolean' && (
        <div className="flex items-center gap-2 pt-0.5">
          <Switch
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked)}
          />
          <span className="text-xs text-gray-500">{value === true ? 'Yes' : 'No'}</span>
        </div>
      )}

      {field.type === 'select' && (
        <Combobox
          value={typeof value === 'string' && value ? value : null}
          onChange={(v) => onChange(v ?? '')}
          placeholder={placeholder || 'Select…'}
          className="h-8 text-sm"
          options={(field.options ?? []).map((opt) => ({
            value: opt.value,
            label: (locale === 'ar' && opt.labelAr) ? opt.labelAr : opt.label,
          }))}
        />
      )}

      {field.type === 'multi_select' && (
        <div className="flex flex-wrap gap-2 pt-1">
          {(field.options ?? []).map((opt) => {
            const selected = Array.isArray(value) && (value as string[]).includes(opt.value);
            const optLabel = (locale === 'ar' && opt.labelAr) ? opt.labelAr : opt.label;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const cur = Array.isArray(value) ? (value as string[]) : [];
                  onChange(selected ? cur.filter((v) => v !== opt.value) : [...cur, opt.value]);
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                  selected
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface-page text-gray-600 border-border hover:border-primary'
                }`}
              >
                {optLabel}
              </button>
            );
          })}
        </div>
      )}

      {field.type === 'user' && (
        <Input
          value={typeof value === 'string' ? value : ''}
          placeholder={placeholder || 'User ID or name'}
          onChange={(e) => onChange(e.target.value || null)}
          className="h-8 text-sm"
        />
      )}
    </div>
  );
}

export function CustomFieldValuesSection({ recordType, recordId }: Props) {
  const { t } = useT();
  const { data, isLoading } = useCustomFieldValues(recordType, recordId);
  const save = useSaveCustomFieldValues(recordType, recordId);

  const fields = data?.items ?? [];

  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!fields.length) return;
    const initial: Record<string, unknown> = {};
    for (const f of fields) initial[f.id] = f.value ?? null;
    setDraft(initial);
    setDirty(false);
  }, [data]);

  if (isLoading) return null;
  if (!fields.length) return null;

  function handleChange(fieldId: string, value: unknown) {
    setDraft((prev) => {
      const next = { ...prev, [fieldId]: value };
      // Changing a field can flip another field's condition — clear any
      // field that just became hidden so a stale answer doesn't linger in
      // the draft (the save path enforces this too, but doing it live keeps
      // the UI honest before the user even hits Save).
      const byKey = new Map<string, ConditionEvalEntry>(fields.map((f) => [f.fieldKey, { condition: f.condition, value: next[f.id] }]));
      for (const f of fields) {
        if (next[f.id] !== null && !isFieldVisible(f.fieldKey, byKey)) next[f.id] = null;
      }
      return next;
    });
    setDirty(true);
  }

  async function handleSave() {
    const values: UpsertCustomFieldValueInput[] = Object.entries(draft).map(([fieldId, value]) => ({
      fieldId,
      value,
    }));
    await save.mutateAsync(values);
    setDirty(false);
  }

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {t('banna.additionalInfo')}
        </p>
        {dirty && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={save.isPending}
            className="h-6 text-xs px-2"
          >
            {save.isPending
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : t('common.save')}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(() => {
          const byKey = new Map<string, ConditionEvalEntry>(fields.map((f) => [f.fieldKey, { condition: f.condition, value: draft[f.id] }]));
          return fields.filter((field) => isFieldVisible(field.fieldKey, byKey));
        })().map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            value={draft[field.id] ?? null}
            onChange={(v) => handleChange(field.id, v)}
          />
        ))}
      </div>
    </div>
  );
}
