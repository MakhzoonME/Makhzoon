'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DialogFooter } from '@/components/ui/dialog';
import { useT } from '@/hooks/ui';
import type { CustomFieldType, CustomField, CustomFieldOption } from '@/types/banna.types';

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'user', label: 'User' },
];

const MODULES = [
  { value: 'assets', label: 'Assets' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'requests', label: 'Requests' },
  { value: 'customers', label: 'Customers' },
];

export interface CustomFieldFormData {
  module: string;
  fieldKey: string;
  type: CustomFieldType;
  label: string;
  labelAr: string;
  required: boolean;
  options: string;
  placeholder: string;
  placeholderAr: string;
  sortOrder: number;
}

interface CustomFieldFormProps {
  initial?: CustomField;
  /** When set, locks the module to this value and hides the module picker
   *  (used when creating a field inline from within another entity's form,
   *  e.g. the customer-creation modal). */
  fixedModule?: string;
  onSubmit: (data: CustomFieldFormData) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

export function CustomFieldForm({ initial, fixedModule, onSubmit, onCancel, submitting }: CustomFieldFormProps) {
  const { t } = useT();
  const [module, setModule] = useState(initial?.module ?? fixedModule ?? 'assets');
  const [fieldKey, setFieldKey] = useState(initial?.fieldKey ?? '');
  const [type, setType] = useState<CustomFieldType>(initial?.type ?? 'text');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [labelAr, setLabelAr] = useState(initial?.labelAr ?? '');
  const [required, setRequired] = useState(initial?.required ?? false);
  const [options, setOptions] = useState(initial?.options ? JSON.stringify(initial.options) : '');
  const [placeholder, setPlaceholder] = useState(initial?.placeholder ?? '');
  const [placeholderAr, setPlaceholderAr] = useState(initial?.placeholderAr ?? '');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedOptions: CustomFieldOption[] | undefined = options.trim()
      ? JSON.parse(options.trim())
      : undefined;
    await onSubmit({
      module, fieldKey, type, label, labelAr, required,
      options: parsedOptions ? JSON.stringify(parsedOptions) : '',
      placeholder, placeholderAr, sortOrder,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-6 pt-4 pb-2">
      <div className="grid grid-cols-2 gap-3">
        {!fixedModule && (
          <div className="space-y-1.5">
            <Label>{t('banna.fieldModule')}</Label>
            <Select value={module} onValueChange={setModule} disabled={!!initial}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODULES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>{t('banna.fieldType')}</Label>
          <Select value={type} onValueChange={(v) => setType(v as CustomFieldType)} disabled={!!initial}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((ft) => (
                <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t('banna.fieldKey')}</Label>
        <Input value={fieldKey} onChange={(e) => setFieldKey(e.target.value)} placeholder="e.g. serial_number" className="font-mono" disabled={!!initial} required />
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
          <Label>{t('banna.fieldOptions')}</Label>
          <Textarea
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            placeholder='[{"value": "opt1", "label": "Option 1"}]'
            rows={3}
          />
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
        <Label>{t('banna.fieldOrder')}</Label>
        <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="w-24" />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>{t('common.cancel')}</Button>
        <Button type="submit" disabled={submitting}>{submitting ? t('common.saving') : t('common.save')}</Button>
      </DialogFooter>
    </form>
  );
}
