'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader, DataTable, FormDrawer } from '@/components/shared'
import type { ColumnDef } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Combobox } from '@/components/ui/combobox'
import { ReportFieldsEditor } from '@/components/document-reports/ReportFieldsEditor'
import { DocumentQrCard } from '@/components/settings/DocumentQrCard'
import {
  useReportTemplates,
  useCreateReportTemplate,
  useUpdateReportTemplate,
} from '@/hooks/document-reports/useReportTemplates'
import { useReportDocumentConfig } from '@/hooks/haraka'
import { useModuleGuard } from '@/hooks/ui'
import { toast } from '@/hooks/ui'
import { VERTICAL_FEATURE_KEYS } from '@/lib/platform/verticals'
import type { ReportDocumentConfig } from '@/lib/modules/document-reports/report-document-config'
import type { DocumentReportTemplate, ReportFieldDef, ReportLanguageMode } from '@/types'

const LANGUAGE_MODE_OPTIONS: { value: ReportLanguageMode; label: string }[] = [
  { value: 'both', label: 'Bilingual (EN + AR)' },
  { value: 'en', label: 'English only' },
  { value: 'ar', label: 'Arabic only' },
]

export default function ReportTemplatesSettingsPage() {
  // Org-scoped page shared across verticals that hold document-report access.
  const { isAllowed } = useModuleGuard({
    featureKeys: VERTICAL_FEATURE_KEYS,
    moduleKey: 'documentReports',
    permOp: 'reportsManageTemplates',
    harakaAddOn: 'documentReports',
  })

  const { data, isLoading } = useReportTemplates()
  const createMutation = useCreateReportTemplate()
  const updateMutation = useUpdateReportTemplate()

  const savedDocConfig = useReportDocumentConfig()
  const [docConfig, setDocConfig] = useState<ReportDocumentConfig>(savedDocConfig)
  const [savingDocConfig, setSavingDocConfig] = useState(false)
  useEffect(() => setDocConfig(savedDocConfig), [savedDocConfig])

  async function handleSaveDocConfig() {
    setSavingDocConfig(true)
    try {
      const res = await fetch('/api/organizations/report-document-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docConfig),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to save')
      toast.success('Appearance settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingDocConfig(false)
    }
  }

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<DocumentReportTemplate | null>(null)
  const [name, setName] = useState('')
  const [languageMode, setLanguageMode] = useState<ReportLanguageMode>('both')
  const [fields, setFields] = useState<ReportFieldDef[]>([])

  if (!isAllowed) return null

  function openCreate() {
    setEditing(null)
    setName('')
    setLanguageMode('both')
    setFields([])
    setDrawerOpen(true)
  }

  function openEdit(template: DocumentReportTemplate) {
    setEditing(template)
    setName(template.name)
    setLanguageMode(template.languageMode)
    setFields(template.fieldSchema)
    setDrawerOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Template name is required')
      return
    }
    const cleanFields = fields.filter((f) => f.fieldKey && (f.label?.trim() || f.labelAr?.trim()))
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, patch: { name, languageMode, fieldSchema: cleanFields } })
      } else {
        await createMutation.mutateAsync({ name, languageMode, fieldSchema: cleanFields })
      }
      setDrawerOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save template')
    }
  }

  async function toggleActive(template: DocumentReportTemplate) {
    try {
      await updateMutation.mutateAsync({ id: template.id, patch: { isActive: !template.isActive } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update template')
    }
  }

  const columns: ColumnDef<DocumentReportTemplate>[] = [
    { key: 'name', header: 'Name', render: (t) => <span className="font-medium text-gray-800">{t.name}</span> },
    { key: 'fieldCount', header: 'Fields', render: (t) => <span className="text-sm text-gray-500">{t.fieldSchema.length}</span> },
    { key: 'schemaVersion', header: 'Version', render: (t) => <span className="text-xs text-gray-400 font-mono">v{t.schemaVersion}</span> },
    {
      key: 'isActive',
      header: 'Active',
      render: (t) => (
        <Switch checked={t.isActive} onCheckedChange={() => toggleActive(t)} onClick={(e) => e.stopPropagation()} />
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Templates"
        description="Define the report types staff can generate for customers — each with its own fields."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 me-2" /> New Template
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage="No report templates yet"
        onRowClick={openEdit}
      />

      <div className="max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Report Appearance</h2>
          <Button size="sm" onClick={handleSaveDocConfig} disabled={savingDocConfig}>
            {savingDocConfig ? 'Saving…' : 'Save'}
          </Button>
        </div>
        <div className="rounded-xl border border-border bg-surface-page p-4 flex items-center justify-between">
          <Label className="font-normal text-gray-700">Show logo</Label>
          <Switch checked={docConfig.showLogo} onCheckedChange={(v) => setDocConfig((c) => ({ ...c, showLogo: v }))} />
        </div>
        <DocumentQrCard
          title="QR code"
          hint="Lets a customer open the online version of a printed/shared report by scanning it."
          value={docConfig}
          onChange={(patch) => setDocConfig((c) => ({ ...c, ...patch }))}
          positionMode="a4"
          lockTarget
        />
      </div>

      <FormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editing ? `Edit ${editing.name}` : 'New Report Template'}
        description="Editing fields updates this template's version — reports already generated keep their original fields and lock for editing."
        width="lg"
      >
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="space-y-1.5">
            <Label htmlFor="template-name">Template Name</Label>
            <Input id="template-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Patient Report" />
          </div>
          <div className="space-y-1.5">
            <Label>Language</Label>
            <Combobox
              value={languageMode}
              onChange={(v) => setLanguageMode((v ?? 'both') as ReportLanguageMode)}
              options={LANGUAGE_MODE_OPTIONS}
              searchable={false}
              clearable={false}
            />
            <p className="text-xs text-gray-400">
              Bilingual asks for both an English and an Arabic name per field, and lets staff pick which language each generated report renders in.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Fields</Label>
            <ReportFieldsEditor fields={fields} onChange={setFields} languageMode={languageMode} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2 flex-shrink-0">
          <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
            Save Template
          </Button>
        </div>
      </FormDrawer>
    </div>
  )
}
