import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const addPaymentSchema = z.object({
  amount:        z.number().positive(),
  paymentMethod: z.string().max(60).nullable().optional(),
  note:          z.string().trim().max(500).nullable().optional(),
})

/** Recalculate amount_paid and payment_status from all entries for an order. */
async function recalcOrder(orgId: string, orderId: string) {
  const { data: payments } = await supabaseAdmin
    .from('haraka_order_payments')
    .select('amount')
    .eq('order_id', orderId)
    .eq('organization_id', orgId)

  const amountPaid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)

  const { data: order } = await supabaseAdmin
    .from('haraka_orders')
    .select('total')
    .eq('id', orderId)
    .eq('organization_id', orgId)
    .maybeSingle()

  const total = Number(order?.total ?? 0)
  const paymentStatus =
    amountPaid <= 0             ? 'unpaid'
    : amountPaid < total - 0.001 ? 'partial'
    :                              'paid'

  await supabaseAdmin
    .from('haraka_orders')
    .update({ amount_paid: amountPaid, payment_status: paymentStatus })
    .eq('id', orderId)
    .eq('organization_id', orgId)

  return { amountPaid, paymentStatus }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { orderId } = await params
    const { data, error } = await supabaseAdmin
      .from('haraka_order_payments')
      .select('id, amount, payment_method, note, paid_at, created_at')
      .eq('order_id', orderId)
      .eq('organization_id', tenant.organizationId)
      .order('paid_at', { ascending: true })
    if (error) throw error
    return NextResponse.json({ payments: data ?? [] })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/orders/[orderId]/payments]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { orderId } = await params

    // Verify order belongs to this org
    const { data: order } = await supabaseAdmin
      .from('haraka_orders')
      .select('id')
      .eq('id', orderId)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const body = await req.json()
    const parsed = addPaymentSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

    const { data: payment, error } = await supabaseAdmin
      .from('haraka_order_payments')
      .insert({
        order_id:        orderId,
        organization_id: tenant.organizationId,
        amount:          parsed.data.amount,
        payment_method:  parsed.data.paymentMethod ?? null,
        note:            parsed.data.note ?? null,
        created_by:      tenant.userId ?? null,
      })
      .select('id, amount, payment_method, note, paid_at, created_at')
      .single()
    if (error) throw error

    const totals = await recalcOrder(tenant.organizationId, orderId)
    return NextResponse.json({ payment, ...totals }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/orders/[orderId]/payments]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
