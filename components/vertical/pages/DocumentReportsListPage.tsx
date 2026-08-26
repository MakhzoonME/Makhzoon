'use client'

// Document Reports list, served to BOTH verticals from one body: Haraka
// mounts it at /haraka/reports, Zeyara at /zeyara/reports. The templates and
// instances are the same org-wide rows either way — only the entitlement key,
// brand color, and route root come from the surrounding VerticalProvider.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { PageHeader, DataTable } from '@/components/shared'
import type { ColumnDef } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { ReportGenerateDrawer } from '@/components/document-reports/ReportGenerateDrawer'
import { useVertical } from '@/components/vertical/VerticalProvider'
import { useReportInstances } from '@/hooks/document-reports/useReportInstances'
import { useModuleGuard } from '@/hooks/ui'
import { formatDate } from '@/lib/utils/date'
import type { DocumentReportInstance } from '@/types'

export function DocumentReportsListPage() {
  const { vertical, featureKey, basePath, colorVar } = useVertical()
  const { isAllowed } = useModuleGuard({
    featureKey,
    moduleKey: 'documentReports',
    permOp: 'reportsView',
    harakaAddOn: 'documentReports',
  })
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data, isLoading } = useReportInstances({ page, pageSize: 25 })

  if (!isAllowed) return null

  const isClinic = vertical === 'zeyara'

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
        description={
          isClinic
            ? 'Documents generated for patients — patient reports, referrals, and other structured records.'
            : 'Documents generated for customers — inspection reports, referrals, and other structured records.'
        }
        actions={
          <Button onClick={() => setDrawerOpen(true)} style={{ background: colorVar }}>
            <Plus className="h-4 w-4 me-2" /> Generate Report
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage="No reports generated yet"
        onRowClick={(r) => router.push(`${basePath}/reports/${r.id}`)}
        pagination={
          data && data.total > 25
            ? { page, pageSize: 25, total: data.total, totalPages: Math.ceil(data.total / 25), onPageChange: setPage }
            : undefined
        }
      />

      <ReportGenerateDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onCreated={(report) => router.push(`${basePath}/reports/${report.id}`)}
      />
    </div>
  )
}
