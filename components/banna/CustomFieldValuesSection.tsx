'use client';
import { useState, useEffect } from 'react';
import { useCustomFieldValues, useSaveCustomFieldValues } from '@/hooks/banna';
import type { CustomFieldWithValue, CustomFieldRecordType, UpsertCustomFieldValueInput } from '@/types/banna.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useT } from '@/hooks/ui';
import { Loader2 } from 'lucide-react';

interface Props {
  recordType: CustomFieldRecordType;
  recordId: string;
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
        <Select
          value={typeof value === 'string' ? value : ''}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={placeholder || 'Select…'} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => {
              const optLabel = (locale === 'ar' && opt.labelAr) ? opt.labelAr : opt.label;
              return (
                <SelectItem key={opt.value} value={opt.value}>
                  {optLabel}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
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
    setDraft((prev) => ({ ...prev, [fieldId]: value }));
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
        {fields.map((field) => (
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
