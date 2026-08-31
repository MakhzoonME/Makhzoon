'use client'

import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { ReportFieldDef, ReportLanguageMode } from '@/types'

const FIELD_TYPES: { value: ReportFieldDef['type']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Single Select' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes / No' },
]

/** Derived from the English name as the admin types it — never typed
 *  directly. Arabic-only templates have no ASCII text to derive from, so
 *  they keep the random key assigned at creation; it's an internal storage
 *  key, never shown, so that's invisible to the user. */
function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function randomKey(): string {
  return `field_${Math.random().toString(36).slice(2, 8)}`
}

/** Dedupes against every other field's current key (not this one's). */
function uniqueKey(base: string, fields: ReportFieldDef[], selfIndex: number): string {
  const taken = new Set(fields.filter((_, i) => i !== selfIndex).map((f) => f.fieldKey))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}_${n}`)) n++
  return `${base}_${n}`
}

function emptyField(sortOrder: number): ReportFieldDef {
  return { fieldKey: randomKey(), type: 'text', label: '', required: false, sortOrder }
}

/** Add/edit/remove/reorder the field definitions on a report template. Kept
 *  as its own component since the settings page also needs the list +
 *  drawer orchestration around it. */
export function ReportFieldsEditor({
  fields,
  onChange,
  languageMode,
}: {
  fields: ReportFieldDef[]
  onChange: (fields: ReportFieldDef[]) => void
  /** Which name input(s) each field shows — set by the template's own language picker. */
  languageMode: ReportLanguageMode
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
              {languageMode !== 'ar' && (
                <Input
                  placeholder="Name (English)"
                  value={field.label ?? ''}
                  onChange={(e) => {
                    const label = e.target.value
                    const slug = slugify(label)
                    updateField(i, { label, ...(slug ? { fieldKey: uniqueKey(slug, fields, i) } : {}) })
                  }}
                />
              )}
              {languageMode !== 'en' && (
                <Input
                  dir="rtl"
                  placeholder="الاسم (عربي)"
                  value={field.labelAr ?? ''}
                  onChange={(e) => updateField(i, { labelAr: e.target.value })}
                />
              )}
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
              {optionTypes.has(field.type) && languageMode !== 'both' && (
                <Input
                  className="sm:col-span-2"
                  dir={languageMode === 'ar' ? 'rtl' : 'ltr'}
                  placeholder={languageMode === 'ar' ? 'الخيارات، مفصولة بفواصل' : 'Options, comma-separated'}
                  value={(field.options ?? []).map((o) => (languageMode === 'ar' ? o.labelAr ?? o.label : o.label)).join(', ')}
                  onChange={(e) => {
                    const options = e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((text) => ({
                        value: text.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                        label: languageMode === 'ar' ? text : text,
                        ...(languageMode === 'ar' ? { labelAr: text } : {}),
                      }))
                    updateField(i, { options })
                  }}
                />
              )}
              {optionTypes.has(field.type) && languageMode === 'both' && (
                <>
                  <Input
                    className="sm:col-span-2"
                    placeholder="Options (English), comma-separated"
                    value={(field.options ?? []).map((o) => o.label).join(', ')}
                    onChange={(e) => {
                      const labels = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                      const existing = field.options ?? []
                      const options = labels.map((label, idx) => ({
                        value: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                        label,
                        labelAr: existing[idx]?.labelAr ?? '',
                      }))
                      updateField(i, { options })
                    }}
                  />
                  <Input
                    className="sm:col-span-2"
                    dir="rtl"
                    placeholder="الخيارات (عربي)، مفصولة بفواصل — بنفس الترتيب"
                    value={(field.options ?? []).map((o) => o.labelAr ?? '').join(', ')}
                    onChange={(e) => {
                      const labelsAr = e.target.value.split(',').map((s) => s.trim())
                      const options = (field.options ?? []).map((o, idx) => ({ ...o, labelAr: labelsAr[idx] ?? '' }))
                      updateField(i, { options })
                    }}
                  />
                </>
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
