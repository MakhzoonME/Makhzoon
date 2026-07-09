import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

/** POST — public (no auth). Driver records a payment collected on delivery. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const limited = await checkRateLimit(`delivery-payment:ip:${getClientIp(req)}`, 30, 60_000)
    if (limited) return limited

    const { token } = await params
    const body = await req.json() as { amount: number; paymentMethod?: string; note?: string }

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 422 })
    }

    const { data: order } = await supabaseAdmin
      .from('haraka_orders')
      .select('id, organization_id, total')
      .eq('delivery_token', token)
      .maybeSingle()

    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Insert payment entry
    await supabaseAdmin
      .from('haraka_order_payments')
      .insert({
        order_id:        order.id,
        organization_id: order.organization_id,
        amount:          body.amount,
        payment_method:  body.paymentMethod ?? null,
        note:            body.note ?? null,
      })

    // Recalculate totals
    const { data: allPayments } = await supabaseAdmin
      .from('haraka_order_payments')
      .select('amount')
      .eq('order_id', order.id)
      .eq('organization_id', order.organization_id)

    const amountPaid = (allPayments ?? []).reduce((s, p) => s + Number(p.amount), 0)
    const total = Number(order.total)
    const paymentStatus =
      amountPaid <= 0              ? 'unpaid'
      : amountPaid < total - 0.001 ? 'partial'
      :                              'paid'

    await supabaseAdmin
      .from('haraka_orders')
      .update({ amount_paid: amountPaid, payment_status: paymentStatus })
      .eq('id', order.id)

    return NextResponse.json({ ok: true, amountPaid, paymentStatus })
  } catch (err) {
    console.error('[POST /api/delivery/[token]/payment]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
