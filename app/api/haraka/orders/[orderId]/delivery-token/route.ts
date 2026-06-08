import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'

/** POST — generate (or return existing) delivery token for an order. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { orderId } = await params

    const { data: order } = await supabaseAdmin
      .from('haraka_orders')
      .select('delivery_token, status')
      .eq('id', orderId)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.status === 'cancelled') return NextResponse.json({ error: 'Cannot share a cancelled order' }, { status: 400 })

    let token = order.delivery_token as string | null
    if (!token) {
      token = randomBytes(24).toString('hex')
      await supabaseAdmin
        .from('haraka_orders')
        .update({ delivery_token: token })
        .eq('id', orderId)
        .eq('organization_id', tenant.organizationId)
    }

    return NextResponse.json({ token })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/orders/[orderId]/delivery-token]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
