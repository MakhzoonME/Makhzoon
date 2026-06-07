import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getOrganizationBySubdomain } from '@/lib/db/organizations'
import { loadOrgReceiptContext } from '@/lib/receipts/public-receipt'
import {
  DEFAULT_SERVICE_JOB_DOCUMENT_CONFIG,
  type ServiceJobDocumentConfig,
} from './service-job-document-config'
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview'
import { DEFAULT_RECEIPT_CONFIG } from '@/lib/receipts/receipt-config'

type Row = Record<string, unknown>

export interface ServiceJobDocumentContext {
  orgId:         string
  orgName:       string
  orgSlug:       string
  tagline:       string
  taglineAr:     string
  taxNumber:     string
  receiptConfig: ReceiptConfig
  docConfig:     ServiceJobDocumentConfig
}

export interface ServiceJobDocumentJob {
  id:               string
  jobNumber:        string
  invoiceNumber:    string | null
  serviceType:      string | null
  customerName:     string
  customerPhone:    string | null
  staffMemberName:  string | null
  serviceAddress:   Record<string, string | null> | null
  items:            Array<{
    name:           string
    description:    string | null
    quantity:       number
    unitPrice:      number
    discountAmount: number
    lineTotal:      number
  }>
  subtotal:         number
  discountAmount:   number
  taxAmount:        number
  total:            number
  paymentStatus:    string
  amountPaid:       number
  paymentMethod:    string | null
  scheduledAt:      string | null
  notes:            string | null
  createdAt:        string
}

export async function loadServiceJobDocument(
  orgSlug: string,
  jobId: string,
): Promise<{ ctx: ServiceJobDocumentContext; job: ServiceJobDocumentJob } | null> {
  const org = await getOrganizationBySubdomain(orgSlug)
  if (!org) return null

  const [receiptCtx, jobRes, configRes] = await Promise.all([
    loadOrgReceiptContext(orgSlug),
    supabaseAdmin
      .from('haraka_service_jobs')
      .select(
        'id, job_number, invoice_number, service_type, ' +
        'customer_name, customer_phone, staff_member_name, service_address, items, ' +
        'subtotal, discount_amount, tax_amount, total, ' +
        'payment_status, amount_paid, payment_method, scheduled_at, notes, created_at',
      )
      .eq('id', jobId)
      .eq('organization_id', org.id)
      .maybeSingle(),
    supabaseAdmin
      .from('organization_configs')
      .select('service_job_document_config')
      .eq('organization_id', org.id)
      .maybeSingle(),
  ])

  if (!jobRes.data || jobRes.error) return null

  const raw = jobRes.data as unknown as Row
  const configData = configRes.data as unknown as Row | null
  const saved = (configData?.service_job_document_config ?? {}) as Partial<ServiceJobDocumentConfig>

  const rc = receiptCtx ?? {
    orgId:     org.id,
    orgName:   org.name,
    tagline:   '',
    taglineAr: '',
    taxNumber: '',
    config:    DEFAULT_RECEIPT_CONFIG,
  }

  type RawItem = {
    name?: string
    description?: string | null
    quantity?: number
    unitPrice?: number
    discountAmount?: number
    lineTotal?: number
  }

  const rawItems = raw.items
  const items = (Array.isArray(rawItems) ? rawItems as RawItem[] : []).map((l) => {
    const sub = Number(l.quantity ?? 0) * Number(l.unitPrice ?? 0) - Number(l.discountAmount ?? 0)
    return {
      name:           l.name ?? 'Service',
      description:    (l.description as string) ?? null,
      quantity:       Number(l.quantity ?? 0),
      unitPrice:      Number(l.unitPrice ?? 0),
      discountAmount: Number(l.discountAmount ?? 0),
      lineTotal:      l.lineTotal != null ? Number(l.lineTotal) : sub,
    }
  })

  return {
    ctx: {
      orgId:         org.id,
      orgName:       org.name,
      orgSlug,
      tagline:       rc.tagline,
      taglineAr:     rc.taglineAr,
      taxNumber:     rc.taxNumber,
      receiptConfig: rc.config,
      docConfig:     { ...DEFAULT_SERVICE_JOB_DOCUMENT_CONFIG, ...saved },
    },
    job: {
      id:              raw.id as string,
      jobNumber:       raw.job_number as string,
      invoiceNumber:   (raw.invoice_number as string) ?? null,
      serviceType:     (raw.service_type as string) ?? null,
      customerName:    raw.customer_name as string,
      customerPhone:   (raw.customer_phone as string) ?? null,
      staffMemberName: (raw.staff_member_name as string) ?? null,
      serviceAddress:  (raw.service_address as Record<string, string | null>) ?? null,
      items,
      subtotal:        Number(raw.subtotal),
      discountAmount:  Number(raw.discount_amount),
      taxAmount:       Number(raw.tax_amount),
      total:           Number(raw.total),
      paymentStatus:   raw.payment_status as string,
      amountPaid:      Number(raw.amount_paid),
      paymentMethod:   (raw.payment_method as string) ?? null,
      scheduledAt:     (raw.scheduled_at as string) ?? null,
      notes:           (raw.notes as string) ?? null,
      createdAt:       raw.created_at as string,
    },
  }
}
