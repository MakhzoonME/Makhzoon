import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type {
  HarakaOrder,
  OrderLineItem,
  OrderStatus,
  OrderFulfillmentType,
  OrderPaymentStatus,
  OrderPaymentMethod,
  OrderDeliveryAddress,
} from '@/types'
import { priceCart, type CartLineInput } from '@/lib/modules/haraka/pricing/calc'

type Row = Record<string, unknown>

function toLine(d: Row): OrderLineItem {
  return {
    inventoryItemId:   d.inventoryItemId as string,
    inventoryItemName: d.inventoryItemName as string,
    sku:               (d.sku as string) ?? null,
    quantity:          Number(d.quantity ?? 0),
    unitPrice:         Number(d.unitPrice ?? 0),
    taxRate:           Number(d.taxRate ?? 0),
    taxAmount:         Number(d.taxAmount ?? 0),
    discountAmount:    Number(d.discountAmount ?? 0),
    lineTotal:         Number(d.lineTotal ?? 0),
  }
}

function toOrder(r: Row): HarakaOrder {
  return {
    id:                     r.id as string,
    organizationId:         r.organization_id as string,
    spaceId:                (r.space_id as string) ?? null,
    orderNumber:            r.order_number as string,
    channel:                (r.channel as string) ?? 'phone',
    status:                 (r.status as OrderStatus) ?? 'new',
    fulfillmentType:        (r.fulfillment_type as OrderFulfillmentType) ?? 'delivery',
    customerId:             (r.customer_id as string) ?? null,
    customerName:           (r.customer_name as string) ?? '',
    customerPhone:          (r.customer_phone as string) ?? null,
    deliveryAddress:        (r.delivery_address as OrderDeliveryAddress) ?? null,
    items:                  Array.isArray(r.items) ? (r.items as Row[]).map(toLine) : [],
    subtotal:               Number(r.subtotal ?? 0),
    discountAmount:         Number(r.discount_amount ?? 0),
    taxAmount:              Number(r.tax_amount ?? 0),
    total:                  Number(r.total ?? 0),
    paymentStatus:          (r.payment_status as OrderPaymentStatus) ?? 'unpaid',
    amountPaid:             Number(r.amount_paid ?? 0),
    paymentMethod:          (r.payment_method as OrderPaymentMethod) ?? null,
    salesAgentId:           r.sales_agent_id as string,
    salesAgentName:         (r.sales_agent_name as string) ?? '',
    deliveryAgentId:        (r.delivery_agent_id as string) ?? null,
    deliveryAgentMemberId:  (r.delivery_agent_member_id as string) ?? null,
    deliveryAgentName:      (r.delivery_agent_name as string) ?? null,
    notes:                  (r.notes as string) ?? null,
    scheduledAt:            r.scheduled_at ? new Date(r.scheduled_at as string) : null,
    createdAt:              r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy:              (r.created_by as string) ?? null,
    updatedAt:              r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy:              (r.updated_by as string) ?? null,
  }
}

async function allocateOrderNumber(orgId: string, spaceId?: string | null): Promise<string> {
  const sid = spaceId ?? ''
  const { data } = await supabaseAdmin
    .from('haraka_order_counters')
    .select('last_order_number')
    .eq('organization_id', orgId)
    .eq('space_id', sid)
    .maybeSingle()
  const next = (data ? Number(data.last_order_number ?? 0) : 0) + 1
  const { error } = await supabaseAdmin
    .from('haraka_order_counters')
    .upsert(
      { organization_id: orgId, space_id: sid, last_order_number: next },
      { onConflict: 'organization_id,space_id' },
    )
  if (error) throw error
  return `ORD-${String(next).padStart(6, '0')}`
}

export interface CreateOrderInput {
  channel: string
  fulfillmentType: 'delivery' | 'pickup'
  customerName: string
  customerPhone?: string | null
  customerId?: string | null
  deliveryAddress?: OrderDeliveryAddress | null
  lines: CartLineInput[]
  salesAgentId: string
  salesAgentName: string
  deliveryAgentId?: string | null
  deliveryAgentMemberId?: string | null
  deliveryAgentName?: string | null
  paymentMethod?: string | null
  scheduledAt?: string | null
  notes?: string | null
}

export interface ListOrdersOpts {
  status?: string
  channel?: string
  salesAgentId?: string
  from?: Date
  to?: Date
  page?: number
  pageSize?: number
}

export class OrdersRepository {
  async list(tenant: TenantContext, opts?: ListOrdersOpts) {
    let q = supabaseAdmin
      .from('haraka_orders')
      .select('*')
      .eq('organization_id', tenant.organizationId)
    if (opts?.status)       q = q.eq('status', opts.status)
    if (opts?.channel)      q = q.eq('channel', opts.channel)
    if (opts?.salesAgentId) q = q.eq('sales_agent_id', opts.salesAgentId)
    if (opts?.from)         q = q.gte('created_at', opts.from.toISOString())
    if (opts?.to)           q = q.lte('created_at', opts.to.toISOString())

    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) throw error

    const items = (data ?? []).map(toOrder)
    const page     = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 20
    const total      = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage   = Math.min(page, totalPages)
    const start      = (safePage - 1) * pageSize
    return { items: items.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages }
  }

  async getById(tenant: TenantContext, id: string): Promise<HarakaOrder | null> {
    const { data } = await supabaseAdmin
      .from('haraka_orders')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || data.organization_id !== tenant.organizationId) return null
    return toOrder(data)
  }

  async create(tenant: TenantContext, input: CreateOrderInput): Promise<HarakaOrder> {
    const orderNumber = await allocateOrderNumber(tenant.organizationId, tenant.spaceId)
    const priced = priceCart(
      input.lines.map((l) => ({ ...l, taxRateId: null, barcode: null })),
    )

    const items = priced.lines.map((l) => ({
      inventoryItemId:   l.itemId,
      inventoryItemName: l.itemName,
      sku:               l.sku ?? null,
      quantity:          l.quantity,
      unitPrice:         l.unitPrice,
      taxRate:           l.taxRate,
      taxAmount:         l.taxAmount,
      discountAmount:    l.discount,
      lineTotal:         l.lineTotal,
    }))

    const { data, error } = await supabaseAdmin
      .from('haraka_orders')
      .insert({
        organization_id:          tenant.organizationId,
        space_id:                 tenant.spaceId ?? null,
        order_number:             orderNumber,
        channel:                  input.channel,
        status:                   'new',
        fulfillment_type:         input.fulfillmentType,
        customer_id:              input.customerId ?? null,
        customer_name:            input.customerName,
        customer_phone:           input.customerPhone ?? null,
        delivery_address:         input.deliveryAddress ?? null,
        items,
        subtotal:                 priced.totals.subtotal,
        discount_amount:          priced.totals.discountTotal,
        tax_amount:               priced.totals.taxTotal,
        total:                    priced.totals.total,
        payment_status:           'unpaid',
        amount_paid:              0,
        payment_method:           input.paymentMethod ?? null,
        sales_agent_id:           input.salesAgentId,
        sales_agent_name:         input.salesAgentName,
        delivery_agent_id:        input.deliveryAgentId ?? null,
        delivery_agent_member_id: input.deliveryAgentMemberId ?? null,
        delivery_agent_name:      input.deliveryAgentName ?? null,
        notes:                    input.notes ?? null,
        scheduled_at:             input.scheduledAt ?? null,
        created_by:               tenant.userId,
        updated_by:               tenant.userId,
      })
      .select('*')
      .single()
    if (error) throw error
    return toOrder(data)
  }

  async update(
    tenant: TenantContext,
    id: string,
    patch: {
      notes?: string | null
      deliveryAddress?: OrderDeliveryAddress | null
      deliveryAgentId?: string | null
      deliveryAgentMemberId?: string | null
      deliveryAgentName?: string | null
      scheduledAt?: string | null
      channel?: string
    },
  ): Promise<HarakaOrder> {
    const update: Row = { updated_by: tenant.userId }
    if ('notes'                 in patch) update.notes                   = patch.notes
    if ('deliveryAddress'       in patch) update.delivery_address        = patch.deliveryAddress
    if ('deliveryAgentId'       in patch) update.delivery_agent_id       = patch.deliveryAgentId
    if ('deliveryAgentMemberId' in patch) update.delivery_agent_member_id = patch.deliveryAgentMemberId
    if ('deliveryAgentName'     in patch) update.delivery_agent_name     = patch.deliveryAgentName
    if ('scheduledAt'           in patch) update.scheduled_at            = patch.scheduledAt
    if ('channel'               in patch) update.channel                 = patch.channel
    const { data, error } = await supabaseAdmin
      .from('haraka_orders')
      .update(update)
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toOrder(data)
  }

  async updateStatus(
    tenant: TenantContext,
    id: string,
    newStatus: OrderStatus,
  ): Promise<HarakaOrder> {
    const { data, error } = await supabaseAdmin
      .from('haraka_orders')
      .update({ status: newStatus, updated_by: tenant.userId })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toOrder(data)
  }

  async recordPayment(
    tenant: TenantContext,
    id: string,
    amountPaid: number,
    paymentMethod: string | null,
  ): Promise<HarakaOrder> {
    const order = await this.getById(tenant, id)
    if (!order) throw new Error('Order not found')
    const paymentStatus: OrderPaymentStatus =
      amountPaid <= 0         ? 'unpaid'
      : amountPaid < order.total ? 'partial'
      :                            'paid'
    const { data, error } = await supabaseAdmin
      .from('haraka_orders')
      .update({
        amount_paid:    amountPaid,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        updated_by:     tenant.userId,
      })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toOrder(data)
  }
}
