import { notFound } from 'next/navigation'
import { FileText } from 'lucide-react'
import { getOrganizationBySubdomain } from '@/lib/db/organizations'
import { ReportInstancesService } from '@/lib/modules/document-reports/instances.service'
import { PrintButton } from '@/components/haraka/PrintButton'
import { isFieldVisible } from '@/lib/modules/banna/condition-eval'
import { getSignedUrl } from '@/lib/storage/upload'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { loadOrgReceiptContext, publicDocumentBaseUrl } from '@/lib/receipts/public-receipt'
import { documentPublicUrl, resolveDocumentQr } from '@/lib/qr'
import { DocumentQr } from '@/components/shared/DocumentQr'
import { DEFAULT_REPORT_DOCUMENT_CONFIG, type ReportDocumentConfig } from '@/lib/modules/document-reports/report-document-config'
import { pickText, isRtl, type ReceiptLang } from '@/lib/receipts/labels'
import type { ReportFieldDef } from '@/types'

export const dynamic = 'force-dynamic'

const service = new ReportInstancesService()

function formatValue(field: ReportFieldDef, value: unknown, lang: ReceiptLang): string {
  if (value === null || value === undefined || value === '') return '—'
  if (field.type === 'boolean') return value === true ? (lang === 'ar' ? 'نعم' : 'Yes') : (lang === 'ar' ? 'لا' : 'No')
  if (field.type === 'select') {
    const o = field.options?.find((o) => o.value === value)
    return o ? pickText(lang, o.label, o.labelAr) : String(value)
  }
  if (field.type === 'multi_select' && Array.isArray(value)) {
    return value.map((v) => {
      const o = field.options?.find((o) => o.value === v)
      return o ? pickText(lang, o.label, o.labelAr) : v
    }).join(', ') || '—'
  }
  if (field.type === 'date') return new Date(value as string).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB')
  return String(value)
}

async function loadReportDocumentConfig(orgId: string): Promise<ReportDocumentConfig> {
  const { data } = await supabaseAdmin
    .from('organization_configs')
    .select('report_document_config')
    .eq('organization_id', orgId)
    .maybeSingle()
  return { ...DEFAULT_REPORT_DOCUMENT_CONFIG, ...(data?.report_document_config ?? {}) }
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ orgSlug: string; token: string }>
}) {
  const { orgSlug, token } = await params
  const org = await getOrganizationBySubdomain(orgSlug)
  if (!org) notFound()

  let report
  try {
    report = await service.getByShareToken(token)
  } catch {
    notFound()
  }
  if (!report || report.organizationId !== org.id) notFound()

  const schema = report.fieldSchemaSnapshot.slice().sort((a, b) => a.sortOrder - b.sortOrder)
  const byKey = new Map(schema.map((f) => [f.fieldKey, { condition: f.condition, value: report!.fieldValues[f.fieldKey] }]))
  const visibleFields = schema.filter((f) => isFieldVisible(f.fieldKey, byKey))
  const lang: ReceiptLang = report.language === 'ar' ? 'ar' : 'en'
  const rtl = isRtl(lang)

  // Signed server-side (service-role) — the public page has no session to
  // hit the authenticated /api/storage/sign route through.
  const attachments = await Promise.all(
    report.attachments.map(async (a) => ({
      ...a,
      url: a.public ? a.url : await getSignedUrl(a.bucket, a.path, 60 * 60),
    })),
  )

  const [docConfig, receiptContext] = await Promise.all([
    loadReportDocumentConfig(org.id),
    loadOrgReceiptContext(orgSlug),
  ])
  const documentUrl = documentPublicUrl('report', orgSlug, token, await publicDocumentBaseUrl())
  const qr = resolveDocumentQr(docConfig, { documentUrl })
  const logo = receiptContext?.config.logo ?? null

  return (
    <div className="min-h-screen bg-white text-gray-900 py-10 px-6 print:p-0" dir={rtl ? 'rtl' : 'ltr'} style={{ position: 'relative' }}>
      <PrintButton />
      {qr && <DocumentQr qr={qr} size="20mm" position={docConfig.qrPositionA4} />}
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="border-b border-gray-200 pb-4">
          {docConfig.showLogo && logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="logo" className="h-10 mb-2 object-contain" style={{ maxWidth: 160 }} />
          )}
          <h1 className="text-xl font-semibold">{org.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{report.templateName}</p>
          <p className="text-xs text-gray-400 mt-1">{new Date(report.createdAt).toLocaleDateString(rtl ? 'ar' : 'en-GB')}</p>
        </header>

        <dl className="space-y-4">
          {visibleFields.map((field) => (
            <div key={field.fieldKey}>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{pickText(lang, field.label, field.labelAr)}</dt>
              <dd className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap">{formatValue(field, report!.fieldValues[field.fieldKey], lang)}</dd>
            </div>
          ))}
        </dl>

        {attachments.length > 0 && (
          <div className="border-t border-gray-200 pt-6 print:hidden">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">Attachments</p>
            <ul className="space-y-1.5">
              {attachments.map((a) => (
                <li key={a.path}>
                  <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline">
                    <FileText className="h-4 w-4" /> {a.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
