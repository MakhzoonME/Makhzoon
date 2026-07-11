import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { OrdersService } from '@/lib/modules/haraka/orders/orders.service'
import { recordPaymentSchema } from '@/lib/modules/haraka/orders/schemas'

const service = new OrdersService()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { orderId } = await params
    const body = await req.json()
    const parsed = recordPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const { amountPaid, paymentMethod } = parsed.data
    const order = await service.recordPayment(tenant, orderId, amountPaid, paymentMethod ?? null)
    return NextResponse.json({ order })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[POST /api/haraka/orders/[orderId]/payment]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
