import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type {
  HarakaReceptionTicket,
  ReceptionTicketStatus,
  ReceptionTicketJobSummary,
  ServiceJobStatus,
  OrderPaymentStatus,
  ServiceLine,
  PosLineItem,
} from '@/types'
import { priceCart, type CartLineInput } from '@/lib/modules/haraka/pricing/calc'

type Row = Record<string, unknown>

function toLine(d: Row): PosLineItem {
  return {
    inventoryItemId:   d.inventoryItemId as string,
    inventoryItemName: d.inventoryItemName as string,
    sku:               (d.sku as string) ?? null,
    barcode:           (d.barcode as string) ?? null,
    quantity:          Number(d.quantity ?? 0),
    unitPrice:         Number(d.unitPrice ?? 0),
    taxRateId:         (d.taxRateId as string) ?? null,
    taxRate:           Number(d.taxRate ?? 0),
    taxAmount:         Number(d.taxAmount ?? 0),
    discountAmount:    Number(d.discountAmount ?? 0),
    lineTotal:         Number(d.lineTotal ?? 0),
  }
}

function toTicket(r: Row): HarakaReceptionTicket {
  return {
    id:               r.id as string,
    organizationId:   r.organization_id as string,
    spaceId:          (r.space_id as string) ?? null,
    ticketNumber:     r.ticket_number as string,
    status:           (r.status as ReceptionTicketStatus) ?? 'open',
    customerId:       (r.customer_id as string) ?? null,
    customerName:     (r.customer_name as string) ?? '',
    customerPhone:    (r.customer_phone as string) ?? null,
    carPlate:         (r.car_plate as string) ?? null,
    items:            Array.isArray(r.items) ? (r.items as Row[]).map(toLine) : [],
    serviceJobId:     (r.service_job_id as string) ?? null,
    productsSubtotal: Number(r.products_subtotal ?? 0),
    productsDiscount: Number(r.products_discount ?? 0),
    productsTax:      Number(r.products_tax ?? 0),
    productsTotal:    Number(r.products_total ?? 0),
    servicesTotal:    Number(r.services_total ?? 0),
    grandTotal:       Number(r.grand_total ?? 0),
    notes:            (r.notes as string) ?? null,
    posTransactionId: (r.pos_transaction_id as string) ?? null,
    paidAt:           r.paid_at ? new Date(r.paid_at as string) : null,
    createdAt:        r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy:        (r.created_by as string) ?? null,
    updatedAt:        r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy:        (r.updated_by as string) ?? null,
  }
}

function toJobSummary(r: Row): ReceptionTicketJobSummary {
  return {
    id:            r.id as string,
    jobNumber:     (r.job_number as string) ?? '',
    status:        (r.status as ServiceJobStatus) ?? 'new',
    paymentStatus: (r.payment_status as OrderPaymentStatus) ?? 'unpaid',
    total:         Number(r.total ?? 0),
    items:         Array.isArray(r.items) ? (r.items as ServiceLine[]) : [],
  }
}

/** Attach a summary of each ticket's linked service job (single batched query). */
async function attachJobs(tickets: HarakaReceptionTicket[]): Promise<HarakaReceptionTicket[]> {
  const jobIds = [...new Set(tickets.map((t) => t.serviceJobId).filter((id): id is string => !!id))]
  if (jobIds.length === 0) return tickets.map((t) => ({ ...t, serviceJob: null }))
  const { data } = await supabaseAdmin
    .from('haraka_service_jobs')
    .select('id, job_number, status, payment_status, total, items')
    .in('id', jobIds)
  const byId = new Map((data ?? []).map((r) => [(r as unknown as Row).id as string, toJobSummary(r as unknown as Row)]))
  return tickets.map((t) => ({ ...t, serviceJob: t.serviceJobId ? byId.get(t.serviceJobId) ?? null : null }))
}

async function allocateTicketNumber(orgId: string, spaceId?: string | null): Promise<string> {
  const sid = spaceId ?? ''
  const { data } = await supabaseAdmin
    .from('haraka_reception_ticket_counters')
    .select('last_ticket_number')
    .eq('organization_id', orgId)
    .eq('space_id', sid)
    .maybeSingle()
  const next = (data ? Number((data as unknown as Row).last_ticket_number ?? 0) : 0) + 1
  const { error } = await supabaseAdmin
    .from('haraka_reception_ticket_counters')
    .upsert(
      { organization_id: orgId, space_id: sid, last_ticket_number: next },
      { onConflict: 'organization_id,space_id' },
    )
  if (error) throw error
  return `RCP-${String(next).padStart(6, '0')}`
}

/** Price product lines and serialize them in the pos_transactions.items shape. */
function priceProducts(lines: CartLineInput[]) {
  const priced = priceCart(lines)
  const items = priced.lines.map((l) => ({
    inventoryItemId:   l.itemId,
    inventoryItemName: l.itemName,
    sku:               l.sku,
    barcode:           l.barcode,
    quantity:          l.quantity,
    unitPrice:         l.unitPrice,
    taxRateId:         l.taxRateId,
    taxRate:           l.taxRate,
    taxAmount:         l.taxAmount,
    discountAmount:    l.discount,
    lineTotal:         l.lineTotal,
  }))
  return { items, totals: priced.totals }
}

export interface CreateTicketInput {
  customerName:   string
  customerPhone?: string | null
  carPlate?:      string | null
  customerId?:    string | null
  productLines:   CartLineInput[]
  serviceJobId?:  string | null
  servicesTotal:  number
  notes?:         string | null
  createdById:    string
}

export interface UpdateTicketInput {
  customerName?:  string
  customerPhone?: string | null
  carPlate?:      string | null
  customerId?:    string | null
  productLines?:  CartLineInput[]
  serviceJobId?:  string | null
  servicesTotal?: number
  notes?:         string | null
}

export interface ListTicketsOpts {
  status?:   string
  /** Matches ticket number, customer name, phone, or car plate. */
  search?:   string
  page?:     number
  pageSize?: number
}

export class ReceptionTicketsRepository {
  async list(tenant: TenantContext, opts?: ListTicketsOpts) {
    let q = supabaseAdmin
      .from('haraka_reception_tickets')
      .select('*')
      .eq('organization_id', tenant.organizationId)
    if (opts?.status) q = q.eq('status', opts.status)
    if (opts?.search?.trim()) {
      // Strip PostgREST or-syntax metacharacters before interpolating.
      const term = opts.search.trim().replace(/[%,()]/g, '')
      if (term) {
        q = q.or(
          `ticket_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%,car_plate.ilike.%${term}%`,
        )
      }
    }

    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) throw error

    const items      = await attachJobs((data ?? []).map(toTicket))
    const page       = opts?.page ?? 1
    const pageSize   = opts?.pageSize ?? 20
    const total      = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage   = Math.min(page, totalPages)
    const start      = (safePage - 1) * pageSize
    return { items: items.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages }
  }

  async getById(tenant: TenantContext, id: string): Promise<HarakaReceptionTicket | null> {
    const { data } = await supabaseAdmin
      .from('haraka_reception_tickets')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || (data as unknown as Row).organization_id !== tenant.organizationId) return null
    const [ticket] = await attachJobs([toTicket(data as unknown as Row)])
    return ticket
  }

  async create(tenant: TenantContext, input: CreateTicketInput): Promise<HarakaReceptionTicket> {
    const ticketNumber = await allocateTicketNumber(tenant.organizationId, tenant.spaceId)
    const { items, totals } = priceProducts(input.productLines)
    const grandTotal = totals.total + input.servicesTotal

    const { data, error } = await supabaseAdmin
      .from('haraka_reception_tickets')
      .insert({
        organization_id:   tenant.organizationId,
        space_id:          tenant.spaceId ?? null,
        ticket_number:     ticketNumber,
        status:            'open',
        customer_id:       input.customerId ?? null,
        customer_name:     input.customerName,
        customer_phone:    input.customerPhone ?? null,
        car_plate:         input.carPlate ?? null,
        items,
        service_job_id:    input.serviceJobId ?? null,
        products_subtotal: totals.subtotal,
        products_discount: totals.discountTotal,
        products_tax:      totals.taxTotal,
        products_total:    totals.total,
        services_total:    input.servicesTotal,
        grand_total:       grandTotal,
        notes:             input.notes ?? null,
        created_by:        input.createdById,
        updated_by:        input.createdById,
      })
      .select('*')
      .single()
    if (error) throw error
    return toTicket(data as unknown as Row)
  }

  async update(tenant: TenantContext, id: string, patch: UpdateTicketInput): Promise<HarakaReceptionTicket> {
    const current = await this.getById(tenant, id)
    if (!current) throw new Error('Ticket not found')

    const update: Row = { updated_by: tenant.userId }
    if (patch.customerName  !== undefined) update.customer_name  = patch.customerName
    if ('customerPhone' in patch)          update.customer_phone = patch.customerPhone ?? null
    if ('carPlate'      in patch)          update.car_plate      = patch.carPlate ?? null
    if ('customerId'    in patch)          update.customer_id    = patch.customerId ?? null
    if ('notes'         in patch)          update.notes          = patch.notes ?? null
    if ('serviceJobId'  in patch)          update.service_job_id = patch.serviceJobId ?? null

    let productsTotal = current.productsTotal
    if (patch.productLines !== undefined) {
      const { items, totals } = priceProducts(patch.productLines)
      update.items             = items
      update.products_subtotal = totals.subtotal
      update.products_discount = totals.discountTotal
      update.products_tax      = totals.taxTotal
      update.products_total    = totals.total
      productsTotal            = totals.total
    }
    const servicesTotal = patch.servicesTotal !== undefined ? patch.servicesTotal : current.servicesTotal
    update.services_total = servicesTotal
    update.grand_total    = productsTotal + servicesTotal

    const { data, error } = await supabaseAdmin
      .from('haraka_reception_tickets')
      .update(update)
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toTicket(data as unknown as Row)
  }

  async setCancelled(tenant: TenantContext, id: string): Promise<HarakaReceptionTicket> {
    const { data, error } = await supabaseAdmin
      .from('haraka_reception_tickets')
      .update({ status: 'cancelled', updated_by: tenant.userId })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toTicket(data as unknown as Row)
  }

  async setPosTransaction(tenant: TenantContext, id: string, posTransactionId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('haraka_reception_tickets')
      .update({ pos_transaction_id: posTransactionId, updated_by: tenant.userId })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
  }

  async setPaid(tenant: TenantContext, id: string): Promise<HarakaReceptionTicket> {
    const { data, error } = await supabaseAdmin
      .from('haraka_reception_tickets')
      .update({
        status:     'paid',
        paid_at:    new Date().toISOString(),
        updated_by: tenant.userId,
      })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toTicket(data as unknown as Row)
  }
}
