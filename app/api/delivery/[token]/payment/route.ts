import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const paymentSchema = z.object({
  amount: z.number().positive().finite(),
  paymentMethod: z.string().max(50).optional(),
  note: z.string().max(500).optional(),
})
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
    const parsed = paymentSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 422 })
    }
    const body = parsed.data

    const { data: order } = await supabaseAdmin
      .from('haraka_orders')
      .select('id, organization_id, total, delivery_token_expires_at, delivery_token_revoked_at')
      .eq('delivery_token', token)
      .maybeSingle()

    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (order.delivery_token_revoked_at) {
      return NextResponse.json({ error: 'This delivery link has been revoked' }, { status: 410 })
    }
    const expiresAt = order.delivery_token_expires_at as string | null
    if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'This delivery link has expired' }, { status: 410 })
    }

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
