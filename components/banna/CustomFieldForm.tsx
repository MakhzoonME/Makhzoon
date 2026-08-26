'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { DialogFooter } from '@/components/ui/dialog';
import { useT } from '@/hooks/ui';
import { slugifyKey, dedupeKey } from '@/lib/utils/format';
import type { CustomFieldType, CustomField, CustomFieldOption, CustomFieldCondition } from '@/types/banna.types';

const MAX_OPTIONS = 50;

const BASE_FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Toggle' },
  { value: 'user', label: 'User' },
];

// Plate/vehicle capture only makes sense on a customer record — hidden for
// assets/inventory custom fields.
const PLATE_READER_TYPE: { value: CustomFieldType; label: string } = {
  value: 'plate_reader', label: 'Plate / Vehicle Reader',
};

const MODULES = [
  { value: 'assets', label: 'Assets' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'customers', label: 'Customers' },
  // Zeyara scopes — fields on a booking and on a clinical record.
  { value: 'appointments', label: 'Appointments' },
  { value: 'visits', label: 'Clinical Records' },
];

export interface CustomFieldFormData {
  module: string;
  fieldKey: string;
  type: CustomFieldType;
  label: string;
  labelAr: string;
  required: boolean;
  /** Array (select/multi_select) or omitted — never a string. The API schema
   *  is z.array(...).optional() and rejects '' or a JSON-stringified value. */
  options?: CustomFieldOption[];
  placeholder: string;
  placeholderAr: string;
  condition?: CustomFieldCondition | null;
  sortOrder: number;
}

interface CustomFieldFormProps {
  initial?: CustomField;
  /** When set, locks the module to this value and hides the module picker
   *  (used when creating a field inline from within another entity's form,
   *  e.g. the customer-creation modal). */
  fixedModule?: string;
  /** Other fields already defined (any module) — used to populate the
   *  "show this field only if…" parent picker, filtered down to the
   *  currently-selected module and minus this field itself. */
  siblingFields?: CustomField[];
  onSubmit: (data: CustomFieldFormData) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const CONDITION_OPERATORS_BY_TYPE: Record<string, { value: CustomFieldCondition['operator']; label: string }[]> = {
  boolean: [
    { value: 'is_true', label: 'Is Yes' },
    { value: 'is_false', label: 'Is No' },
  ],
  multi_select: [{ value: 'in', label: 'Includes' }],
};
const DEFAULT_OPERATORS: { value: CustomFieldCondition['operator']; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
];

export function CustomFieldForm({ initial, fixedModule, siblingFields, onSubmit, onCancel, submitting }: CustomFieldFormProps) {
  const { t } = useT();
  const [module, setModule] = useState(initial?.module ?? fixedModule ?? 'assets');
  const [type, setType] = useState<CustomFieldType>(initial?.type ?? 'text');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [labelAr, setLabelAr] = useState(initial?.labelAr ?? '');
  const [required, setRequired] = useState(initial?.required ?? false);
  const [options, setOptions] = useState<CustomFieldOption[]>(initial?.options ?? []);
  const [placeholder, setPlaceholder] = useState(initial?.placeholder ?? '');
  const [placeholderAr, setPlaceholderAr] = useState(initial?.placeholderAr ?? '');
  const [condition, setCondition] = useState<CustomFieldCondition | null>(initial?.condition ?? null);

  const fieldTypes = module === 'customers' ? [...BASE_FIELD_TYPES, PLATE_READER_TYPE] : BASE_FIELD_TYPES;

  const parentCandidates = (siblingFields ?? []).filter(
    (f) => f.module === module && f.fieldKey !== initial?.fieldKey,
  );
  const conditionParent = parentCandidates.find((f) => f.fieldKey === condition?.parentFieldKey);
  const conditionOperators = conditionParent
    ? (CONDITION_OPERATORS_BY_TYPE[conditionParent.type] ?? DEFAULT_OPERATORS)
    : DEFAULT_OPERATORS;

  function setConditionParent(parentFieldKey: string | null) {
    if (!parentFieldKey) { setCondition(null); return; }
    const parent = parentCandidates.find((f) => f.fieldKey === parentFieldKey);
    const operators = parent ? (CONDITION_OPERATORS_BY_TYPE[parent.type] ?? DEFAULT_OPERATORS) : DEFAULT_OPERATORS;
    setCondition({ parentFieldKey, operator: operators[0].value, value: undefined });
  }

  function addOption() {
    setOptions((prev) => (prev.length >= MAX_OPTIONS ? prev : [...prev, { value: '', label: '', labelAr: '' }]));
  }

  function updateOption(index: number, patch: Partial<CustomFieldOption>) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Only select/multi_select carry options; every other type (text, number,
    // date, boolean, user) must omit the key entirely — the API schema is
    // z.array(...).optional() and rejects '' or a stringified array.
    const isChoiceType = type === 'select' || type === 'multi_select';
    const usedOptionKeys = new Set<string>();
    const cleanOptions = options
      .map((o) => ({ label: o.label.trim(), labelAr: o.labelAr?.trim() || undefined }))
      .filter((o) => o.label)
      .map((o) => {
        const key = dedupeKey(slugifyKey(o.label, 'option'), usedOptionKeys);
        usedOptionKeys.add(key);
        return { value: key, ...o };
      });
    const fieldKey = initial?.fieldKey ?? slugifyKey(label, 'field');
    // is_true/is_false carry no value; everything else needs one to be a
    // real condition, so an unfinished picker (parent chosen, value not yet)
    // is dropped rather than saved as "always hidden".
    const needsValue = condition && condition.operator !== 'is_true' && condition.operator !== 'is_false';
    const hasValue = Array.isArray(condition?.value) ? condition.value.length > 0 : !!condition?.value;
    const cleanCondition = condition && (!needsValue || hasValue)
      ? { ...condition, value: needsValue ? condition.value : undefined }
      : null;
    await onSubmit({
      module, fieldKey, type, label, labelAr, required,
      options: isChoiceType && cleanOptions.length > 0 ? cleanOptions : undefined,
      placeholder, placeholderAr,
      condition: cleanCondition,
      // Order is server-assigned on create (always appended to the bottom)
      // and untouched on edit — only drag-reordering on the fields list
      // changes it after that.
      sortOrder: initial?.sortOrder ?? 0,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-6 pt-4 pb-2">
      <div className="grid grid-cols-2 gap-3">
        {!fixedModule && (
          <div className="space-y-1.5">
            <Label>{t('banna.fieldModule')}</Label>
            <Combobox
              value={module}
              onChange={(v) => { setModule(v ?? module); setCondition(null); }}
              options={MODULES}
              disabled={!!initial}
              searchable={false}
              clearable={false}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>{t('banna.fieldType')}</Label>
          <Combobox
            value={type}
            onChange={(v) => setType((v ?? type) as CustomFieldType)}
            options={fieldTypes}
            disabled={!!initial}
            searchable={false}
            clearable={false}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t('banna.fieldLabel')}</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>{t('banna.fieldLabelAr')}</Label>
          <Input value={labelAr} onChange={(e) => setLabelAr(e.target.value)} dir="rtl" />
        </div>
      </div>

      {(type === 'select' || type === 'multi_select') && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>{t('banna.fieldOptions')}</Label>
            <span className="text-xs text-gray-400">{options.length}/{MAX_OPTIONS}</span>
          </div>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={opt.label}
                  onChange={(e) => updateOption(i, { label: e.target.value })}
                  placeholder="Label"
                />
                <Input
                  value={opt.labelAr ?? ''}
                  onChange={(e) => updateOption(i, { labelAr: e.target.value })}
                  placeholder="Label (Arabic)"
                  dir="rtl"
                />
                <Button type="button" size="sm" variant="ghost" onClick={() => removeOption(i)} aria-label={t('common.remove')}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addOption}
            disabled={options.length >= MAX_OPTIONS}
          >
            <Plus className="h-3.5 w-3.5 me-1" /> {t('banna.addOption')}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t('banna.fieldPlaceholder')}</Label>
          <Input value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t('banna.fieldPlaceholder')} (Arabic)</Label>
          <Input value={placeholderAr} onChange={(e) => setPlaceholderAr(e.target.value)} dir="rtl" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={required} onCheckedChange={setRequired} id="field-required" />
        <Label htmlFor="field-required">{t('banna.fieldRequired')}</Label>
      </div>

      <div className="space-y-1.5">
        <Label>{t('banna.fieldConditional')}</Label>
        <Combobox
          value={condition?.parentFieldKey ?? null}
          onChange={setConditionParent}
          options={parentCandidates.map((f) => ({ value: f.fieldKey, label: f.label }))}
          placeholder={t('banna.fieldConditionalNone')}
          searchable
        />
        {condition && conditionParent && (
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-2.5">
            <Combobox
              value={condition.operator}
              onChange={(v) => setCondition({ ...condition, operator: (v ?? condition.operator) as CustomFieldCondition['operator'], value: undefined })}
              options={conditionOperators}
              searchable={false}
              clearable={false}
            />
            {condition.operator !== 'is_true' && condition.operator !== 'is_false' && (
              conditionParent.type === 'select' || conditionParent.type === 'multi_select' ? (
                <Combobox
                  value={typeof condition.value === 'string' ? condition.value : null}
                  onChange={(v) => setCondition({ ...condition, value: condition.operator === 'in' ? (v ? [v] : []) : (v ?? undefined) })}
                  options={(conditionParent.options ?? []).map((o) => ({ value: o.value, label: o.label }))}
                  placeholder="Value"
                  searchable={false}
                />
              ) : (
                <Input
                  value={typeof condition.value === 'string' ? condition.value : ''}
                  onChange={(e) => setCondition({ ...condition, value: e.target.value })}
                  placeholder="Value"
                />
              )
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>{t('common.cancel')}</Button>
        <Button type="submit" disabled={submitting}>{submitting ? t('common.saving') : t('common.save')}</Button>
      </DialogFooter>
    </form>
  );
}
