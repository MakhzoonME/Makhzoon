'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ExternalLink, Link2 } from 'lucide-react'
import { PageHeader, DocumentUpload, DocumentList } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ReportValuesForm } from '@/components/document-reports/ReportValuesForm'
import { useReportInstance, useUpdateReportInstance } from '@/hooks/document-reports/useReportInstances'
import { useModuleGuard, toast } from '@/hooks/ui'
import { useAuthStore } from '@/store/auth.store'
import { hasPermByKey } from '@/lib/permissions'
import { formatDate } from '@/lib/utils/date'
import type { ReportAttachment } from '@/types'

export default function DocumentReportDetailPage() {
  const { isAllowed } = useModuleGuard({
    featureKey: 'pos',
    moduleKey: 'documentReports',
    permOp: 'reportsView',
    harakaAddOn: 'documentReports',
  })
  const params = useParams<{ orgSlug: string; reportId: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const { data, isLoading } = useReportInstance(params.reportId)
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={report.templateName}
        description={`Generated ${formatDate(report.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
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
