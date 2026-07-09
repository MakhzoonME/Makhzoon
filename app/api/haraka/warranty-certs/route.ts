import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { rateLimitTenant } from '@/lib/rate-limit'
import { WarrantyCertsService } from '@/lib/modules/haraka/warranty-certs/warranty-certs.service'
import { createWarrantyCertSchema } from '@/lib/modules/haraka/warranty-certs/schemas'

const service = new WarrantyCertsService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { searchParams } = new URL(req.url)
    const result = await service.list(tenant, {
      orderId:       searchParams.get('orderId')       ?? undefined,
      transactionId: searchParams.get('transactionId') ?? undefined,
      from:     searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
      to:       searchParams.get('to')   ? new Date(searchParams.get('to')!)   : undefined,
      page:     searchParams.get('page')     ? parseInt(searchParams.get('page')!, 10)     : undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/warranty-certs]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const limited = await rateLimitTenant(tenant, 'warranty-certs', 30, 60_000)
    if (limited) return limited
    const body = await req.json()
    const parsed = createWarrantyCertSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data
    const cert = await service.create(tenant, {
      sourceType:         d.sourceType,
      orderId:            d.orderId ?? null,
      transactionId:      d.transactionId ?? null,
      customerName:       d.customerName,
      customerPhone:      d.customerPhone ?? null,
      items:              d.items.map((i) => ({
        inventoryItemId:   i.inventoryItemId,
        inventoryItemName: i.inventoryItemName,
        sku:               i.sku ?? null,
        quantity:          i.quantity,
        unitPrice:         i.unitPrice,
      })),
      warrantyStartDate:  d.warrantyStartDate,
      warrantyEndDate:    d.warrantyEndDate,
      notes:              d.notes ?? null,
    })
    return NextResponse.json({ cert }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[POST /api/haraka/warranty-certs]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
