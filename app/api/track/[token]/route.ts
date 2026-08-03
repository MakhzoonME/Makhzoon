import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

type Row = Record<string, unknown>

/**
 * GET — public, no auth. Returns order details by CUSTOMER token for the
 * read-only tracking page (/track/[token]).
 *
 * This is the read-only counterpart to /api/delivery/[token]: it resolves the
 * customer_token (never the delivery_token) and exposes no mutation routes, so
 * the customer can view status/items/payment but cannot take any action.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const limited = await checkRateLimit(`track:ip:${getClientIp(_req)}`, 60, 60_000)
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
        'organization_id, customer_token_expires_at, customer_token_revoked_at',
      )
      .eq('customer_token', token)
      .maybeSingle()

    const order = orderRes.data as Row | null
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (order.customer_token_revoked_at) {
      return NextResponse.json({ error: 'This tracking link has been revoked' }, { status: 410 })
    }
    const expiresAt = order.customer_token_expires_at as string | null
    if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'This tracking link has expired' }, { status: 410 })
    }

    const orgId   = order.organization_id as string
    const orderId = order.id as string

    // Payment entries — shown read-only (no recording).
    const { data: payments } = await supabaseAdmin
      .from('haraka_order_payments')
      .select('id, amount, payment_method, note, paid_at')
      .eq('order_id', orderId)
      .eq('organization_id', orgId)
      .order('paid_at', { ascending: true })

    const orgRes = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .maybeSingle()
    const org = orgRes.data as Row | null

    const {
      organization_id: _org,
      customer_token_expires_at: _exp,
      customer_token_revoked_at: _rev,
      ...publicOrder
    } = order

    return NextResponse.json({
      order: { ...publicOrder, orderId },
      payments: payments ?? [],
      orgName: (org?.name as string) ?? '',
    })
  } catch (err) {
    console.error('[GET /api/track/[token]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
