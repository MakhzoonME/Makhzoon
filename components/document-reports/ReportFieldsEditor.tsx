'use client'

import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { ReportFieldDef } from '@/types'

const FIELD_TYPES: { value: ReportFieldDef['type']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Single Select' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes / No' },
]

function emptyField(sortOrder: number): ReportFieldDef {
  return { fieldKey: '', type: 'text', label: '', required: false, sortOrder }
}

/** Add/edit/remove/reorder the field definitions on a report template. Kept
 *  as its own component since the settings page also needs the list +
 *  drawer orchestration around it. */
export function ReportFieldsEditor({
  fields,
  onChange,
}: {
  fields: ReportFieldDef[]
  onChange: (fields: ReportFieldDef[]) => void
}) {
  function updateField(index: number, patch: Partial<ReportFieldDef>) {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  function removeField(index: number) {
    onChange(fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, sortOrder: i })))
  }

  function addField() {
    onChange([...fields, emptyField(fields.length)])
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= fields.length) return
    const next = [...fields]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next.map((f, i) => ({ ...f, sortOrder: i })))
  }

  const optionTypes = new Set(['select', 'multi_select'])

  return (
    <div className="space-y-3">
      {fields.map((field, i) => (
        <div key={i} className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex flex-col gap-1 pt-1.5">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === fields.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="Field label"
                value={field.label}
                onChange={(e) => updateField(i, { label: e.target.value })}
              />
              <Input
                placeholder="field_key"
                value={field.fieldKey}
                onChange={(e) => updateField(i, { fieldKey: e.target.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
              />
              <Select value={field.type} onValueChange={(v) => updateField(i, { type: v as ReportFieldDef['type'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((ft) => (
                    <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(i, { required: e.target.checked })}
                />
                Required
              </label>
              {optionTypes.has(field.type) && (
                <Input
                  className="sm:col-span-2"
                  placeholder="Options, comma-separated"
                  value={(field.options ?? []).map((o) => o.label).join(', ')}
                  onChange={(e) => {
                    const options = e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((label) => ({ value: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'), label }))
                    updateField(i, { options })
                  }}
                />
              )}
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => removeField(i)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addField}>
        <Plus className="h-4 w-4 me-2" /> Add Field
      </Button>
    </div>
  )
}
