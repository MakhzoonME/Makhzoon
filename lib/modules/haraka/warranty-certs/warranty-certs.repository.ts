import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type {
  HarakaWarrantyCert,
  HarakaWarrantyConfig,
  WarrantyCertItem,
  WarrantyCertSourceType,
} from '@/types'

type Row = Record<string, unknown>

const CONFIG_DEFAULTS: Omit<HarakaWarrantyConfig, 'organizationId'> = {
  defaultDurationDays: 180,
  termsText:    null,
  termsTextAr:  null,
  headerText:   null,
  headerTextAr: null,
  footerText:   null,
  footerTextAr: null,
  showLogo:     true,
  showQr:       true,
  language:     'en',
  template:     'a4-modern',
  accentColor:  '#C2185B',
}

function toConfig(r: Row): HarakaWarrantyConfig {
  return {
    organizationId:      r.organization_id as string,
    defaultDurationDays: Number(r.default_duration_days ?? 180),
    termsText:           (r.terms_text as string) ?? null,
    termsTextAr:         (r.terms_text_ar as string) ?? null,
    headerText:          (r.header_text as string) ?? null,
    headerTextAr:        (r.header_text_ar as string) ?? null,
    footerText:          (r.footer_text as string) ?? null,
    footerTextAr:        (r.footer_text_ar as string) ?? null,
    showLogo:            (r.show_logo as boolean) ?? true,
    showQr:              (r.show_qr as boolean) ?? true,
    language:            (r.language as 'en'|'ar'|'both') ?? 'en',
    template:            (r.template as string) ?? 'a4-modern',
    accentColor:         (r.accent_color as string) ?? '#C2185B',
  }
}

function toCert(r: Row): HarakaWarrantyCert {
  return {
    id:                 r.id as string,
    organizationId:     r.organization_id as string,
    spaceId:            (r.space_id as string) ?? null,
    warrantyNumber:     r.warranty_number as string,
    sourceType:         r.source_type as WarrantyCertSourceType,
    orderId:            (r.order_id as string) ?? null,
    transactionId:      (r.transaction_id as string) ?? null,
    customerName:       r.customer_name as string,
    customerPhone:      (r.customer_phone as string) ?? null,
    items:              Array.isArray(r.items) ? (r.items as WarrantyCertItem[]) : [],
    warrantyStartDate:  r.warranty_start_date as string,
    warrantyEndDate:    r.warranty_end_date as string,
    notes:              (r.notes as string) ?? null,
    createdAt:          r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy:          (r.created_by as string) ?? null,
    updatedAt:          r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy:          (r.updated_by as string) ?? null,
  }
}

async function allocateWarrantyNumber(orgId: string, spaceId?: string | null): Promise<string> {
  const sid = spaceId ?? ''
  const { data } = await supabaseAdmin
    .from('haraka_warranty_counters')
    .select('last_number')
    .eq('organization_id', orgId)
    .eq('space_id', sid)
    .maybeSingle()
  const next = (data ? Number(data.last_number ?? 0) : 0) + 1
  const { error } = await supabaseAdmin
    .from('haraka_warranty_counters')
    .upsert(
      { organization_id: orgId, space_id: sid, last_number: next },
      { onConflict: 'organization_id,space_id' },
    )
  if (error) throw error
  return `WRT-${String(next).padStart(6, '0')}`
}

export interface ListCertsOpts {
  orderId?: string
  transactionId?: string
  from?: Date
  to?: Date
  page?: number
  pageSize?: number
}

export interface CreateCertInput {
  sourceType: WarrantyCertSourceType
  orderId?: string | null
  transactionId?: string | null
  customerName: string
  customerPhone?: string | null
  items: WarrantyCertItem[]
  warrantyStartDate: string
  warrantyEndDate: string
  notes?: string | null
}

export class WarrantyCertsRepository {
  async getConfig(orgId: string): Promise<HarakaWarrantyConfig> {
    const { data } = await supabaseAdmin
      .from('haraka_warranty_configs')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle()
    if (!data) return { organizationId: orgId, ...CONFIG_DEFAULTS }
    return toConfig(data)
  }

  async upsertConfig(tenant: TenantContext, patch: Partial<Omit<HarakaWarrantyConfig, 'organizationId'>>): Promise<HarakaWarrantyConfig> {
    const update: Row = { organization_id: tenant.organizationId, updated_by: tenant.userId }
    if (patch.defaultDurationDays !== undefined) update.default_duration_days = patch.defaultDurationDays
    if (patch.termsText    !== undefined) update.terms_text     = patch.termsText
    if (patch.termsTextAr  !== undefined) update.terms_text_ar  = patch.termsTextAr
    if (patch.headerText   !== undefined) update.header_text    = patch.headerText
    if (patch.headerTextAr !== undefined) update.header_text_ar = patch.headerTextAr
    if (patch.footerText   !== undefined) update.footer_text    = patch.footerText
    if (patch.footerTextAr !== undefined) update.footer_text_ar = patch.footerTextAr
    if (patch.showLogo     !== undefined) update.show_logo      = patch.showLogo
    if (patch.showQr       !== undefined) update.show_qr        = patch.showQr
    if (patch.language     !== undefined) update.language       = patch.language
    if (patch.template     !== undefined) update.template       = patch.template
    if (patch.accentColor  !== undefined) update.accent_color   = patch.accentColor
    const { data, error } = await supabaseAdmin
      .from('haraka_warranty_configs')
      .upsert(update, { onConflict: 'organization_id' })
      .select('*')
      .single()
    if (error) throw error
    return toConfig(data)
  }

  async list(tenant: TenantContext, opts?: ListCertsOpts) {
    let q = supabaseAdmin
      .from('haraka_warranty_certs')
      .select('*')
      .eq('organization_id', tenant.organizationId)
    if (opts?.orderId)       q = q.eq('order_id', opts.orderId)
    if (opts?.transactionId) q = q.eq('transaction_id', opts.transactionId)
    if (opts?.from)          q = q.gte('created_at', opts.from.toISOString())
    if (opts?.to)            q = q.lte('created_at', opts.to.toISOString())
    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) throw error
    const items = (data ?? []).map(toCert)
    const page     = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 20
    const total      = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage   = Math.min(page, totalPages)
    const start      = (safePage - 1) * pageSize
    return { items: items.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages }
  }

  async getById(orgId: string, id: string): Promise<HarakaWarrantyCert | null> {
    const { data } = await supabaseAdmin
      .from('haraka_warranty_certs')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || data.organization_id !== orgId) return null
    return toCert(data)
  }

  async findByOrderId(tenant: TenantContext, orderId: string): Promise<HarakaWarrantyCert | null> {
    const { data } = await supabaseAdmin
      .from('haraka_warranty_certs')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data ? toCert(data) : null
  }

  async create(tenant: TenantContext, input: CreateCertInput): Promise<HarakaWarrantyCert> {
    const warrantyNumber = await allocateWarrantyNumber(tenant.organizationId, tenant.spaceId)
    const { data, error } = await supabaseAdmin
      .from('haraka_warranty_certs')
      .insert({
        organization_id:    tenant.organizationId,
        space_id:           tenant.spaceId ?? null,
        warranty_number:    warrantyNumber,
        source_type:        input.sourceType,
        order_id:           input.orderId ?? null,
        transaction_id:     input.transactionId ?? null,
        customer_name:      input.customerName,
        customer_phone:     input.customerPhone ?? null,
        items:              input.items,
        warranty_start_date: input.warrantyStartDate,
        warranty_end_date:   input.warrantyEndDate,
        notes:              input.notes ?? null,
        created_by:         tenant.userId,
        updated_by:         tenant.userId,
      })
      .select('*')
      .single()
    if (error) throw error
    return toCert(data)
  }

  async delete(tenant: TenantContext, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('haraka_warranty_certs')
      .delete()
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
  }
}
