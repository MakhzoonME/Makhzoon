import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

type Row = Record<string, unknown>

/** GET — public, no auth. Returns order details by delivery token. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const limited = await checkRateLimit(`delivery:ip:${getClientIp(_req)}`, 60, 60_000)
    if (limited) return limited

    const { token } = await params

    const orderRes = await supabaseAdmin
      .from('haraka_orders')
      .select(
        'id, order_number, invoice_number, channel, status, fulfillment_type, ' +
        'customer_name, customer_phone, delivery_address, items, ' +
        'subtotal, discount_amount, tax_amount, total, ' +
        'payment_status, amount_paid, payment_method, ' +
        'sales_agent_name, delivery_agent_name, notes, scheduled_at, created_at, ' +
        'organization_id, delivery_token_expires_at, delivery_token_revoked_at',
      )
      .eq('delivery_token', token)
      .maybeSingle()

    const order = orderRes.data as Row | null
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (order.delivery_token_revoked_at) {
      return NextResponse.json({ error: 'This delivery link has been revoked' }, { status: 410 })
    }
    const expiresAt = order.delivery_token_expires_at as string | null
    if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'This delivery link has expired' }, { status: 410 })
    }

    const orgId        = order.organization_id as string
    const orderId      = order.id as string

    // Fetch payment entries
    const { data: payments } = await supabaseAdmin
      .from('haraka_order_payments')
      .select('id, amount, payment_method, note, paid_at')
      .eq('order_id', orderId)
      .eq('organization_id', orgId)
      .order('paid_at', { ascending: true })

    // Fetch org name for display
    const orgRes = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .maybeSingle()
    const org = orgRes.data as Row | null

    const {
      organization_id: _org,
      delivery_token_expires_at: _exp,
      delivery_token_revoked_at: _rev,
      ...publicOrder
    } = order

    return NextResponse.json({
      order: { ...publicOrder, orderId },
      payments: payments ?? [],
      orgName: (org?.name as string) ?? '',
    })
  } catch (err) {
    console.error('[GET /api/delivery/[token]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
