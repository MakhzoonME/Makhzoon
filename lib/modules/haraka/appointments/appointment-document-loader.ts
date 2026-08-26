import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getOrganizationBySubdomain } from '@/lib/db/organizations'
import { loadOrgReceiptContext } from '@/lib/receipts/public-receipt'
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview'
import { DEFAULT_RECEIPT_CONFIG } from '@/lib/receipts/receipt-config'
import {
  DEFAULT_APPOINTMENT_DOCUMENT_CONFIG,
  type AppointmentDocumentConfig,
} from './appointment-document-config'

type Row = Record<string, unknown>

export interface AppointmentDocumentContext {
  orgId: string
  orgName: string
  orgSlug: string
  tagline: string
  taxNumber: string
  receiptConfig: ReceiptConfig
  docConfig: AppointmentDocumentConfig
}

export interface AppointmentDocumentAppointment {
  id: string
  appointmentNumber: string
  invoiceNumber: string | null
  customerName: string
  customerPhone: string | null
  serviceName: string | null
  staffName: string | null
  scheduledAt: string
  durationMinutes: number
  price: number
  taxAmount: number
  total: number
  paymentStatus: string
  amountPaid: number
  notes: string | null
  createdAt: string
}

export async function loadAppointmentDocument(
  orgSlug: string,
  appointmentId: string,
): Promise<{ ctx: AppointmentDocumentContext; appointment: AppointmentDocumentAppointment } | null> {
  const org = await getOrganizationBySubdomain(orgSlug)
  if (!org) return null

  const [receiptCtx, apptRes, configRes] = await Promise.all([
    loadOrgReceiptContext(orgSlug),
    supabaseAdmin
      .from('haraka_appointments')
      .select(
        'id, appointment_number, invoice_number, customer_name, customer_phone, ' +
        'service_id, staff_id, scheduled_at, duration_minutes, price, tax_amount, total, ' +
        'payment_status, amount_paid, notes, created_at',
      )
      .eq('id', appointmentId)
      .eq('organization_id', org.id)
      .maybeSingle(),
    supabaseAdmin
      .from('organization_configs')
      .select('appointment_document_config')
      .eq('organization_id', org.id)
      .maybeSingle(),
  ])

  if (!apptRes.data || apptRes.error) return null
  const raw = apptRes.data as unknown as Row
  const configData = configRes.data as unknown as Row | null
  const savedDocConfig = (configData?.appointment_document_config ?? {}) as Partial<AppointmentDocumentConfig>

  const [serviceRes, staffRes] = await Promise.all([
    raw.service_id
      ? supabaseAdmin.from('haraka_services').select('name').eq('id', raw.service_id as string).maybeSingle()
      : Promise.resolve({ data: null }),
    raw.staff_id
      ? supabaseAdmin.from('haraka_staff').select('name').eq('id', raw.staff_id as string).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const rc = receiptCtx ?? {
    orgId: org.id,
    orgName: org.name,
    tagline: '',
    taglineAr: '',
    taxNumber: '',
    config: DEFAULT_RECEIPT_CONFIG,
  }

  return {
    ctx: {
      orgId: org.id,
      orgName: org.name,
      orgSlug,
      tagline: rc.tagline,
      taxNumber: rc.taxNumber,
      receiptConfig: rc.config,
      docConfig: { ...DEFAULT_APPOINTMENT_DOCUMENT_CONFIG, ...savedDocConfig },
    },
    appointment: {
      id: raw.id as string,
      appointmentNumber: raw.appointment_number as string,
      invoiceNumber: (raw.invoice_number as string) ?? null,
      customerName: raw.customer_name as string,
      customerPhone: (raw.customer_phone as string) ?? null,
      serviceName: (serviceRes.data as Row | null)?.name as string ?? null,
      staffName: (staffRes.data as Row | null)?.name as string ?? null,
      scheduledAt: raw.scheduled_at as string,
      durationMinutes: Number(raw.duration_minutes),
      price: Number(raw.price),
      taxAmount: Number(raw.tax_amount),
      total: Number(raw.total),
      paymentStatus: raw.payment_status as string,
      amountPaid: Number(raw.amount_paid),
      notes: (raw.notes as string) ?? null,
      createdAt: raw.created_at as string,
    },
  }
}
