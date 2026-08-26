'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { PageHeader, DataTable } from '@/components/shared'
import type { ColumnDef } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { ReportGenerateDrawer } from '@/components/document-reports/ReportGenerateDrawer'
import { useReportInstances } from '@/hooks/document-reports/useReportInstances'
import { useModuleGuard } from '@/hooks/ui'
import { formatDate } from '@/lib/utils/date'
import type { DocumentReportInstance } from '@/types'

export default function DocumentReportsListPage() {
  const { isAllowed } = useModuleGuard({
    featureKey: 'pos',
    moduleKey: 'documentReports',
    permOp: 'reportsView',
    harakaAddOn: 'documentReports',
  })
  const router = useRouter()
  const params = useParams<{ locale: string; orgSlug: string; space: string }>()
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data, isLoading } = useReportInstances({ page, pageSize: 25 })

  if (!isAllowed) return null

  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`

  const columns: ColumnDef<DocumentReportInstance>[] = [
    { key: 'templateName', header: 'Template', render: (r) => <span className="font-medium text-gray-800">{r.templateName}</span> },
    {
      key: 'encounterType',
      header: 'Encounter',
      render: (r) => <span className="text-xs text-gray-500 capitalize">{r.encounterType.replace('_', ' ')}</span>,
    },
    {
      key: 'isEditable',
      header: 'Status',
      render: (r) => (
        <span className={`text-xs font-medium ${r.isEditable ? 'text-green-600' : 'text-gray-400'}`}>
          {r.isEditable ? 'Editable' : 'Locked (template updated)'}
        </span>
      ),
    },
    { key: 'createdAt', header: 'Created', render: (r) => <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Documents generated for customers — patient reports, referrals, and other structured records."
        actions={
          <Button onClick={() => setDrawerOpen(true)} style={{ background: 'var(--mod-haraka)' }}>
            <Plus className="h-4 w-4 me-2" /> Generate Report
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage="No reports generated yet"
        onRowClick={(r) => router.push(`${base}/reports/${r.id}`)}
        pagination={
          data && data.total > 25
            ? { page, pageSize: 25, total: data.total, totalPages: Math.ceil(data.total / 25), onPageChange: setPage }
            : undefined
        }
      />

      <ReportGenerateDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onCreated={(report) => router.push(`${base}/reports/${report.id}`)}
      />
    </div>
  )
}
