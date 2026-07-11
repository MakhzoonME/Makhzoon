import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type {
  HarakaRetainer,
  HarakaRetainerInvoice,
  RetainerStatus,
  BillingCycle,
  OrderPaymentStatus,
} from '@/types'
import { allocateRetainerNumber, allocateRetainerInvoiceNumber } from './retainer-numbering'

type Row = Record<string, unknown>

function toRetainer(r: Row): HarakaRetainer {
  return {
    id:               r.id as string,
    organizationId:   r.organization_id as string,
    spaceId:          (r.space_id as string) ?? null,
    retainerNumber:   r.retainer_number as string,
    name:             r.name as string,
    customerId:       (r.customer_id as string) ?? null,
    customerName:     (r.customer_name as string) ?? '',
    customerPhone:    (r.customer_phone as string) ?? null,
    staffMemberId:    (r.staff_member_id as string) ?? null,
    staffMemberName:  (r.staff_member_name as string) ?? null,
    billingCycle:     (r.billing_cycle as BillingCycle) ?? 'monthly',
    amountPerCycle:   Number(r.amount_per_cycle ?? 0),
    taxRate:          Number(r.tax_rate ?? 0),
    startDate:        r.start_date as string,
    endDate:          (r.end_date as string) ?? null,
    status:           (r.status as RetainerStatus) ?? 'active',
    nextBillingDate:  (r.next_billing_date as string) ?? null,
    notes:            (r.notes as string) ?? null,
    createdAt:        r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy:        (r.created_by as string) ?? null,
    updatedAt:        r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy:        (r.updated_by as string) ?? null,
  }
}

function toInvoice(r: Row): HarakaRetainerInvoice {
  return {
    id:                   r.id as string,
    retainerId:           r.retainer_id as string,
    organizationId:       r.organization_id as string,
    invoiceNumber:        r.invoice_number as string,
    billingPeriodStart:   r.billing_period_start as string,
    billingPeriodEnd:     r.billing_period_end as string,
    dueDate:              (r.due_date as string) ?? null,
    amount:               Number(r.amount ?? 0),
    taxAmount:            Number(r.tax_amount ?? 0),
    total:                Number(r.total ?? 0),
    paymentStatus:        (r.payment_status as OrderPaymentStatus) ?? 'unpaid',
    amountPaid:           Number(r.amount_paid ?? 0),
    paymentMethod:        (r.payment_method as string) ?? null,
    paidAt:               r.paid_at ? new Date(r.paid_at as string) : null,
    notes:                (r.notes as string) ?? null,
    createdAt:            r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy:            (r.created_by as string) ?? null,
  }
}

function advanceBillingDate(date: string, cycle: BillingCycle): string {
  const d = new Date(date)
  if (cycle === 'monthly')   d.setMonth(d.getMonth() + 1)
  if (cycle === 'quarterly') d.setMonth(d.getMonth() + 3)
  if (cycle === 'annual')    d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

export interface CreateRetainerInput {
  name:             string
  customerName:     string
  customerPhone?:   string | null
  customerId?:      string | null
  staffMemberId?:   string | null
  staffMemberName?: string | null
  billingCycle:     BillingCycle
  amountPerCycle:   number
  taxRate:          number
  startDate:        string
  endDate?:         string | null
  notes?:           string | null
}

export interface ListRetainersOpts {
  status?:   string
  page?:     number
  pageSize?: number
}

export interface CreateRetainerInvoiceInput {
  billingPeriodStart: string
  billingPeriodEnd:   string
  dueDate?:           string | null
  notes?:             string | null
}

export class RetainersRepository {
  async list(tenant: TenantContext, opts?: ListRetainersOpts) {
    let q = supabaseAdmin
      .from('haraka_retainers')
      .select('*')
      .eq('organization_id', tenant.organizationId)
    if (opts?.status) q = q.eq('status', opts.status)

    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) throw error

    const items     = (data ?? []).map(toRetainer)
    const page      = opts?.page ?? 1
    const pageSize  = opts?.pageSize ?? 20
    const total     = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage  = Math.min(page, totalPages)
    const start     = (safePage - 1) * pageSize
    return { items: items.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages }
  }

  async getById(tenant: TenantContext, id: string): Promise<HarakaRetainer | null> {
    const { data } = await supabaseAdmin
      .from('haraka_retainers')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || (data as unknown as Row).organization_id !== tenant.organizationId) return null
    return toRetainer(data as unknown as Row)
  }

  async create(tenant: TenantContext, input: CreateRetainerInput): Promise<HarakaRetainer> {
    const retainerNumber = await allocateRetainerNumber(tenant.organizationId, tenant.spaceId)
    const nextBillingDate = advanceBillingDate(input.startDate, input.billingCycle)

    const { data, error } = await supabaseAdmin
      .from('haraka_retainers')
      .insert({
        organization_id:   tenant.organizationId,
        space_id:          tenant.spaceId ?? null,
        retainer_number:   retainerNumber,
        name:              input.name,
        customer_id:       input.customerId ?? null,
        customer_name:     input.customerName,
        customer_phone:    input.customerPhone ?? null,
        staff_member_id:   input.staffMemberId ?? null,
        staff_member_name: input.staffMemberName ?? null,
        billing_cycle:     input.billingCycle,
        amount_per_cycle:  input.amountPerCycle,
        tax_rate:          input.taxRate,
        start_date:        input.startDate,
        end_date:          input.endDate ?? null,
        status:            'active',
        next_billing_date: nextBillingDate,
        notes:             input.notes ?? null,
        created_by:        tenant.userId,
        updated_by:        tenant.userId,
      })
      .select('*')
      .single()
    if (error) throw error
    return toRetainer(data as unknown as Row)
  }

  async update(
    tenant: TenantContext,
    id: string,
    patch: {
      name?:            string
      staffMemberId?:   string | null
      staffMemberName?: string | null
      endDate?:         string | null
      notes?:           string | null
    },
  ): Promise<HarakaRetainer> {
    const update: Row = { updated_by: tenant.userId }
    if ('name'            in patch) update.name              = patch.name
    if ('staffMemberId'   in patch) update.staff_member_id   = patch.staffMemberId
    if ('staffMemberName' in patch) update.staff_member_name = patch.staffMemberName
    if ('endDate'         in patch) update.end_date          = patch.endDate
    if ('notes'           in patch) update.notes             = patch.notes

    const { data, error } = await supabaseAdmin
      .from('haraka_retainers')
      .update(update)
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toRetainer(data as unknown as Row)
  }

  async updateStatus(tenant: TenantContext, id: string, status: RetainerStatus): Promise<HarakaRetainer> {
    const { data, error } = await supabaseAdmin
      .from('haraka_retainers')
      .update({ status, updated_by: tenant.userId })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toRetainer(data as unknown as Row)
  }

  async delete(tenant: TenantContext, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('haraka_retainers')
      .delete()
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
  }

  async listInvoices(tenant: TenantContext, retainerId: string): Promise<HarakaRetainerInvoice[]> {
    const { data, error } = await supabaseAdmin
      .from('haraka_retainer_invoices')
      .select('*')
      .eq('retainer_id', retainerId)
      .eq('organization_id', tenant.organizationId)
      .order('billing_period_start', { ascending: false })
    if (error) throw error
    return (data ?? []).map((r) => toInvoice(r as unknown as Row))
  }

  async createInvoice(
    tenant: TenantContext,
    retainer: HarakaRetainer,
    input: CreateRetainerInvoiceInput,
  ): Promise<HarakaRetainerInvoice> {
    // Guard: block duplicate for same billing period
    const { data: existing } = await supabaseAdmin
      .from('haraka_retainer_invoices')
      .select('id')
      .eq('retainer_id', retainer.id)
      .eq('billing_period_start', input.billingPeriodStart)
      .maybeSingle()
    if (existing) throw new Error('An invoice already exists for this billing period')

    const invoiceNumber = await allocateRetainerInvoiceNumber(tenant.organizationId)
    const taxAmount = retainer.amountPerCycle * retainer.taxRate
    const total     = retainer.amountPerCycle + taxAmount

    const { data, error } = await supabaseAdmin
      .from('haraka_retainer_invoices')
      .insert({
        retainer_id:          retainer.id,
        organization_id:      tenant.organizationId,
        invoice_number:       invoiceNumber,
        billing_period_start: input.billingPeriodStart,
        billing_period_end:   input.billingPeriodEnd,
        due_date:             input.dueDate ?? null,
        amount:               retainer.amountPerCycle,
        tax_amount:           taxAmount,
        total,
        payment_status:       'unpaid',
        amount_paid:          0,
        notes:                input.notes ?? null,
        created_by:           tenant.userId,
      })
      .select('*')
      .single()
    if (error) throw error

    // Advance next_billing_date on the retainer
    const nextDate = advanceBillingDate(input.billingPeriodStart, retainer.billingCycle)
    await supabaseAdmin
      .from('haraka_retainers')
      .update({ next_billing_date: nextDate, updated_by: tenant.userId })
      .eq('id', retainer.id)
      .eq('organization_id', tenant.organizationId)

    return toInvoice(data as unknown as Row)
  }

  async updateInvoice(
    tenant: TenantContext,
    retainerId: string,
    invoiceId: string,
    patch: {
      paymentStatus?: OrderPaymentStatus
      amountPaid?:    number
      paymentMethod?: string | null
      paidAt?:        string | null
      notes?:         string | null
    },
  ): Promise<HarakaRetainerInvoice> {
    const update: Row = {}
    if ('paymentStatus' in patch) update.payment_status = patch.paymentStatus
    if ('amountPaid'    in patch) update.amount_paid    = patch.amountPaid
    if ('paymentMethod' in patch) update.payment_method = patch.paymentMethod
    if ('paidAt'        in patch) update.paid_at        = patch.paidAt
    if ('notes'         in patch) update.notes          = patch.notes

    const { data, error } = await supabaseAdmin
      .from('haraka_retainer_invoices')
      .update(update)
      .eq('id', invoiceId)
      .eq('retainer_id', retainerId)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toInvoice(data as unknown as Row)
  }

  async deleteInvoice(tenant: TenantContext, retainerId: string, invoiceId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('haraka_retainer_invoices')
      .delete()
      .eq('id', invoiceId)
      .eq('retainer_id', retainerId)
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
  }
}
