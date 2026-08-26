'use client'

import { useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { isFieldVisible } from '@/lib/modules/banna/condition-eval'
import type { ReportFieldDef } from '@/types'

/** Renders the fill-in form for a report's field schema, honoring
 *  conditional visibility exactly like Banna's customer custom fields. */
export function ReportValuesForm({
  schema,
  values,
  onChange,
  disabled,
}: {
  schema: ReportFieldDef[]
  values: Record<string, unknown>
  onChange: (fieldKey: string, value: unknown) => void
  disabled?: boolean
}) {
  const byKey = useMemo(
    () => new Map(schema.map((f) => [f.fieldKey, { condition: f.condition, value: values[f.fieldKey] }])),
    [schema, values],
  )

  const visibleFields = schema
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((f) => isFieldVisible(f.fieldKey, byKey))

  return (
    <div className="space-y-4">
      {visibleFields.map((field) => (
        <div key={field.fieldKey} className="space-y-1.5">
          <Label>{field.label}{field.required && <span className="text-red-500"> *</span>}</Label>
          <ReportValueInput field={field} value={values[field.fieldKey]} onChange={(v) => onChange(field.fieldKey, v)} disabled={disabled} />
        </div>
      ))}
    </div>
  )
}

function ReportValueInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: ReportFieldDef
  value: unknown
  onChange: (value: unknown) => void
  disabled?: boolean
}) {
  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          rows={4}
        />
      )
    case 'number':
      return (
        <Input
          type="number"
          value={(value as number | string) ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      )
    case 'date':
      return (
        <Input
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )
    case 'boolean':
      return (
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
          {field.placeholder ?? 'Yes'}
        </label>
      )
    case 'select':
      return (
        <Select value={(value as string) ?? undefined} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger><SelectValue placeholder={field.placeholder ?? 'Select…'} /></SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'multi_select': {
      const selected = Array.isArray(value) ? (value as string[]) : []
      return (
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map((o) => {
            const checked = selected.includes(o.value)
            return (
              <button
                key={o.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange(checked ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
                className={`px-2.5 py-1 rounded-full text-xs border ${checked ? 'bg-primary-600 text-white border-primary-600' : 'border-border text-gray-600'}`}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )
    }
    case 'user':
    case 'text':
    default:
      return (
        <Input
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      )
  }
}
