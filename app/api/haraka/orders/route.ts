import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { rateLimitTenant } from '@/lib/rate-limit'
import { OrdersService } from '@/lib/modules/haraka/orders/orders.service'
import { createOrderSchema } from '@/lib/modules/haraka/orders/schemas'

const service = new OrdersService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const limited = await rateLimitTenant(tenant, 'haraka-orders', 120, 60_000)
    if (limited) return limited
    const { searchParams } = new URL(req.url)
    const result = await service.list(tenant, {
      status:       searchParams.get('status') ?? undefined,
      channel:      searchParams.get('channel') ?? undefined,
      salesAgentId: searchParams.get('salesAgentId') ?? undefined,
      from:         searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
      to:           searchParams.get('to')   ? new Date(searchParams.get('to')!)   : undefined,
      page:         searchParams.get('page')     ? parseInt(searchParams.get('page')!, 10)     : undefined,
      pageSize:     searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/orders]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const body = await req.json()
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data
    const order = await service.create(tenant, {
      channel:               d.channel,
      fulfillmentType:       d.fulfillmentType,
      customerName:          d.customerName,
      customerPhone:         d.customerPhone ?? null,
      customerId:            d.customerId ?? null,
      deliveryAddress:       d.deliveryAddress ?? null,
      lines:                 d.items.map((l) => ({
        itemId:    l.inventoryItemId,
        itemName:  l.inventoryItemName,
        sku:       l.sku ?? null,
        barcode:   null,
        quantity:  l.quantity,
        unitPrice: l.unitPrice,
        taxRateId: null,
        taxRate:   l.taxRate,
        discount:  l.discountAmount ?? 0,
      })),
      salesAgentId:          d.salesAgentId,
      salesAgentName:        d.salesAgentName,
      deliveryAgentId:       d.deliveryAgentId ?? null,
      deliveryAgentMemberId: d.deliveryAgentMemberId ?? null,
      deliveryAgentName:     d.deliveryAgentName ?? null,
      paymentMethod:         d.paymentMethod ?? null,
      scheduledAt:           d.scheduledAt ?? null,
      notes:                 d.notes ?? null,
    })
    return NextResponse.json({ order }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[POST /api/haraka/orders]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
