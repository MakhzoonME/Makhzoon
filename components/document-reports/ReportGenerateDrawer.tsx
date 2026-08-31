'use client'

import { useMemo, useState } from 'react'
import { FormDrawer, DocumentUpload } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ReportValuesForm } from './ReportValuesForm'
import { useReportTemplates } from '@/hooks/document-reports/useReportTemplates'
import { useCreateReportInstance } from '@/hooks/document-reports/useReportInstances'
import { useCustomers, useCustomerHistory } from '@/hooks/haraka'
import { toast } from '@/hooks/ui'
import type { DocumentReportInstance, ReportAttachment, ReportEncounterType } from '@/types'

const ENCOUNTER_LABELS: Record<ReportEncounterType, string> = {
  appointment: 'Appointment',
  service_job: 'Service Job',
  order: 'Order',
}

/** Encounter types the manual picker can resolve, because the customer history
 *  timeline carries them. */
const PICKABLE_ENCOUNTERS: ReportEncounterType[] = ['appointment', 'service_job', 'order']

/** Generates a new report. When customerId/encounter are already known (e.g.
 *  opened from an appointment detail page), pass them to skip straight to
 *  picking a template and filling fields. Otherwise the drawer lets the user
 *  search for a customer and pick one of their existing encounters. */
export function ReportGenerateDrawer({
  open,
  onOpenChange,
  customerId: fixedCustomerId,
  encounterType: fixedEncounterType,
  encounterId: fixedEncounterId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId?: string
  encounterType?: ReportEncounterType
  encounterId?: string
  onCreated?: (report: DocumentReportInstance) => void
}) {
  const { data: templatesData } = useReportTemplates({ activeOnly: true })
  const createMutation = useCreateReportInstance()

  const [templateId, setTemplateId] = useState('')
  const [customerId, setCustomerId] = useState(fixedCustomerId ?? '')
  const [customerSearch, setCustomerSearch] = useState('')
  const [encounterType, setEncounterType] = useState<ReportEncounterType | ''>(fixedEncounterType ?? '')
  const [encounterId, setEncounterId] = useState(fixedEncounterId ?? '')
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [attachments, setAttachments] = useState<ReportAttachment[]>([])
  const [language, setLanguage] = useState<'en' | 'ar'>('en')

  const { data: customersData } = useCustomers({ search: customerSearch, enabled: !fixedCustomerId && customerSearch.length > 1 })
  const { data: historyData } = useCustomerHistory(!fixedEncounterId && customerId ? customerId : undefined)

  const template = templatesData?.items.find((t) => t.id === templateId)
  // Single-language templates aren't a choice — only 'both' needs the picker.
  const resolvedLanguage: 'en' | 'ar' = template ? (template.languageMode === 'both' ? language : template.languageMode) : language

  const encounterOptions = useMemo(() => {
    if (!historyData || !encounterType) return []
    return historyData.entries.filter((e) => e.kind === encounterType)
  }, [historyData, encounterType])

  function reset() {
    setTemplateId('')
    setCustomerId(fixedCustomerId ?? '')
    setCustomerSearch('')
    setEncounterType(fixedEncounterType ?? '')
    setEncounterId(fixedEncounterId ?? '')
    setValues({})
    setAttachments([])
    setLanguage('en')
  }

  async function handleSubmit() {
    if (!templateId || !customerId || !encounterType || !encounterId) {
      toast.error('Pick a template, customer, and encounter first')
      return
    }
    try {
      const { report } = await createMutation.mutateAsync({
        templateId,
        customerId,
        encounterType,
        encounterId,
        fieldValues: values,
        attachments,
        language: resolvedLanguage,
      })
      toast.success('Report generated')
      onCreated?.(report)
      onOpenChange(false)
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate report')
    }
  }

  return (
    <FormDrawer open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset() }} title="Generate Report" width="lg">
      <div className="p-6 space-y-5 overflow-y-auto flex-1">
        <div className="space-y-1.5">
          <Label>Template</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger><SelectValue placeholder="Choose a report type…" /></SelectTrigger>
            <SelectContent>
              {(templatesData?.items ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!fixedCustomerId && (
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Input
              placeholder="Search by name or phone…"
              value={customerSearch}
              onChange={(e) => { setCustomerSearch(e.target.value); setCustomerId('') }}
            />
            {customerSearch.length > 1 && !customerId && (
              <div className="rounded-lg border border-border divide-y divide-border max-h-40 overflow-y-auto">
                {(customersData?.items ?? []).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-start px-3 py-2 text-sm hover:bg-surface-page"
                    onClick={() => { setCustomerId(c.id); setCustomerSearch(c.name) }}
                  >
                    {c.name}{c.phone ? <span className="text-gray-400 ms-2">{c.phone}</span> : null}
                  </button>
                ))}
                {(customersData?.items ?? []).length === 0 && (
                  <p className="px-3 py-2 text-sm text-gray-400">No matches</p>
                )}
              </div>
            )}
          </div>
        )}

        {!fixedEncounterType && customerId && (
          <div className="space-y-1.5">
            <Label>Encounter Type</Label>
            <Select value={encounterType} onValueChange={(v) => { setEncounterType(v as ReportEncounterType); setEncounterId('') }}>
              <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
              <SelectContent>
                {PICKABLE_ENCOUNTERS.map((k) => (
                  <SelectItem key={k} value={k}>{ENCOUNTER_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!fixedEncounterId && encounterType && (
          <div className="space-y-1.5">
            <Label>Encounter</Label>
            <Select value={encounterId} onValueChange={setEncounterId}>
              <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
              <SelectContent>
                {encounterOptions.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.reference} — {new Date(e.date).toLocaleDateString()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {encounterOptions.length === 0 && (
              <p className="text-xs text-gray-400">This customer has no {ENCOUNTER_LABELS[encounterType].toLowerCase()} records yet.</p>
            )}
          </div>
        )}

        {template?.languageMode === 'both' && (
          <div className="space-y-1.5">
            <Label>Report Language</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as 'en' | 'ar')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabic</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">Can be changed later from the report itself.</p>
          </div>
        )}

        {template && (
          <div className="pt-2 border-t border-border space-y-4">
            <ReportValuesForm
              schema={template.fieldSchema}
              values={values}
              onChange={(key, v) => setValues((prev) => ({ ...prev, [key]: v }))}
              lang={resolvedLanguage}
            />
            <div className="space-y-1.5">
              <Label>Attachments</Label>
              <DocumentUpload kind="report-attachment" value={attachments} onChange={setAttachments} />
            </div>
          </div>
        )}
      </div>
      <div className="px-6 py-4 border-t border-border flex justify-end gap-2 flex-shrink-0">
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={createMutation.isPending}>Generate</Button>
      </div>
    </FormDrawer>
  )
}
