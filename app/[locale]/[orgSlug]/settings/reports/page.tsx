'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader, DataTable, FormDrawer } from '@/components/shared'
import type { ColumnDef } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ReportFieldsEditor } from '@/components/document-reports/ReportFieldsEditor'
import {
  useReportTemplates,
  useCreateReportTemplate,
  useUpdateReportTemplate,
} from '@/hooks/document-reports/useReportTemplates'
import { useModuleGuard } from '@/hooks/ui'
import { toast } from '@/hooks/ui'
import { VERTICAL_FEATURE_KEYS } from '@/lib/platform/verticals'
import type { DocumentReportTemplate, ReportFieldDef } from '@/types'

export default function ReportTemplatesSettingsPage() {
  // Org-scoped page shared by both verticals — a clinic holding 'zeyara' but
  // not 'pos' builds its patient-report templates here too.
  const { isAllowed } = useModuleGuard({
    featureKeys: VERTICAL_FEATURE_KEYS,
    moduleKey: 'documentReports',
    permOp: 'reportsManageTemplates',
    harakaAddOn: 'documentReports',
  })

  const { data, isLoading } = useReportTemplates()
  const createMutation = useCreateReportTemplate()
  const updateMutation = useUpdateReportTemplate()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<DocumentReportTemplate | null>(null)
  const [name, setName] = useState('')
  const [fields, setFields] = useState<ReportFieldDef[]>([])

  if (!isAllowed) return null

  function openCreate() {
    setEditing(null)
    setName('')
    setFields([])
    setDrawerOpen(true)
  }

  function openEdit(template: DocumentReportTemplate) {
    setEditing(template)
    setName(template.name)
    setFields(template.fieldSchema)
    setDrawerOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Template name is required')
      return
    }
    const cleanFields = fields.filter((f) => f.fieldKey && f.label)
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, patch: { name, fieldSchema: cleanFields } })
      } else {
        await createMutation.mutateAsync({ name, fieldSchema: cleanFields })
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
            <Label>Fields</Label>
            <ReportFieldsEditor fields={fields} onChange={setFields} />
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
