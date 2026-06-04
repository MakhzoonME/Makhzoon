import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** GET — public, no auth. Returns order details by delivery token. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params

    const { data: order } = await supabaseAdmin
      .from('haraka_orders')
      .select(
        'id, order_number, invoice_number, channel, status, fulfillment_type, ' +
        'customer_name, customer_phone, delivery_address, items, ' +
        'subtotal, discount_amount, tax_amount, total, ' +
        'payment_status, amount_paid, payment_method, ' +
        'sales_agent_name, delivery_agent_name, notes, scheduled_at, created_at, ' +
        'organization_id',
      )
      .eq('delivery_token', token)
      .maybeSingle()

    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Fetch payment entries
    const { data: payments } = await supabaseAdmin
      .from('haraka_order_payments')
      .select('id, amount, payment_method, note, paid_at')
      .eq('order_id', order.id)
      .eq('organization_id', order.organization_id)
      .order('paid_at', { ascending: true })

    // Fetch org name for display
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', order.organization_id)
      .maybeSingle()

    return NextResponse.json({
      order: { ...order, orderId: order.id },
      payments: payments ?? [],
      orgName: org?.name ?? '',
    })
  } catch (err) {
    console.error('[GET /api/delivery/[token]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
