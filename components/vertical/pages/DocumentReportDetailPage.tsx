'use client'

// One report: view, edit-in-place (while the template hasn't drifted), print,
// and share. Served to both verticals from one body — see
// DocumentReportsListPage for why.
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ExternalLink, Link2 } from 'lucide-react'
import { PageHeader, DocumentUpload, DocumentList } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ReportValuesForm } from '@/components/document-reports/ReportValuesForm'
import { useVertical } from '@/components/vertical/VerticalProvider'
import { useReportInstance, useUpdateReportInstance } from '@/hooks/document-reports/useReportInstances'
import { useReportTemplate } from '@/hooks/document-reports/useReportTemplates'
import { useModuleGuard, toast } from '@/hooks/ui'
import { useAuthStore } from '@/store/auth.store'
import { hasPermByKey } from '@/lib/permissions'
import { formatDate } from '@/lib/utils/date'
import type { ReportAttachment } from '@/types'

export function DocumentReportDetailPage() {
  const { featureKey } = useVertical()
  const { isAllowed } = useModuleGuard({
    featureKey,
    moduleKey: 'documentReports',
    permOp: 'reportsView',
    harakaAddOn: 'documentReports',
  })
  const params = useParams<{ orgSlug: string; reportId: string }>()
  const { user } = useAuthStore()
  const { data, isLoading } = useReportInstance(params.reportId)
  const { data: templateData } = useReportTemplate(data?.report?.templateId)
  const updateMutation = useUpdateReportInstance()

  const [values, setValues] = useState<Record<string, unknown>>({})
  const [attachments, setAttachments] = useState<ReportAttachment[]>([])
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (data?.report) {
      setValues(data.report.fieldValues)
      setAttachments(data.report.attachments)
    }
  }, [data?.report])

  if (!isAllowed) return null
  if (isLoading) return null
  const report = data?.report
  if (!report) return null

  const canEdit = !!user && hasPermByKey(user, 'documentReports.reportsEdit')
  const isBilingual = templateData?.template.languageMode === 'both'
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/r/${params.orgSlug}/reports/${report.shareToken}`
    : ''

  async function handleSave() {
    try {
      await updateMutation.mutateAsync({ id: report!.id, patch: { fieldValues: values, attachments } })
      toast.success('Report updated')
      setEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save report')
    }
  }

  async function handleLanguageSwitch(language: 'en' | 'ar') {
    if (language === report!.language) return
    try {
      await updateMutation.mutateAsync({ id: report!.id, patch: { language } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to switch language')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={report.templateName}
        description={`Generated ${formatDate(report.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            {isBilingual && (
              <div className="flex items-center rounded-lg border border-border overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => handleLanguageSwitch('en')}
                  className={`px-3 py-1.5 ${report.language === 'en' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-surface-page'}`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageSwitch('ar')}
                  className={`px-3 py-1.5 ${report.language === 'ar' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-surface-page'}`}
                >
                  AR
                </button>
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Share link copied') }}
            >
              <Link2 className="h-4 w-4 me-2" /> Copy Share Link
            </Button>
            <Button variant="outline" onClick={() => window.open(`/r/${params.orgSlug}/reports/${report.shareToken}?print=1`, '_blank')}>
              <ExternalLink className="h-4 w-4 me-2" /> Print / Share
            </Button>
            {canEdit && !editing && (
              report.isEditable ? (
                <Button onClick={() => setEditing(true)}>Edit</Button>
              ) : (
                <Button disabled title="This report's template has been updated since this report was created. Editing is locked to preserve the original record — create a new report to use the current template.">
                  Edit (locked)
                </Button>
              )
            )}
          </div>
        }
      />

      <div className="rounded-lg border border-border bg-surface-card p-6 max-w-2xl">
        <ReportValuesForm
          schema={report.fieldSchemaSnapshot}
          values={values}
          onChange={(key, v) => setValues((prev) => ({ ...prev, [key]: v }))}
          disabled={!editing}
          lang={report.language}
        />

        <div className="pt-4 mt-4 border-t border-border">
          {editing ? (
            <div className="space-y-1.5">
              <Label>Attachments</Label>
              <DocumentUpload kind="report-attachment" value={attachments} onChange={setAttachments} />
            </div>
          ) : (
            <DocumentList value={attachments} label="Attachments" emptyText="No attachments" />
          )}
        </div>

        {editing && (
          <div className="flex justify-end gap-2 pt-5 mt-5 border-t border-border">
            <Button
              variant="outline"
              onClick={() => { setValues(report.fieldValues); setAttachments(report.attachments); setEditing(false) }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>Save Changes</Button>
          </div>
        )}
      </div>
    </div>
  )
}
