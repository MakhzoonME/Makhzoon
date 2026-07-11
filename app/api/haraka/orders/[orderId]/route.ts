import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { OrdersService } from '@/lib/modules/haraka/orders/orders.service'
import { updateOrderSchema } from '@/lib/modules/haraka/orders/schemas'

const service = new OrdersService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { orderId } = await params
    const order = await service.getById(tenant, orderId)
    return NextResponse.json({ order })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/orders/[orderId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { orderId } = await params
    const body = await req.json()
    const parsed = updateOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const order = await service.update(tenant, orderId, parsed.data)
    return NextResponse.json({ order })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[PATCH /api/haraka/orders/[orderId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
