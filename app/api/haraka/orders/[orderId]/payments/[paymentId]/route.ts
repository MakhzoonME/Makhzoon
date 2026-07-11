import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { supabaseAdmin } from '@/lib/supabase/admin'

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
    amountPaid <= 0              ? 'unpaid'
    : amountPaid < total - 0.001 ? 'partial'
    :                              'paid'

  await supabaseAdmin
    .from('haraka_orders')
    .update({ amount_paid: amountPaid, payment_status: paymentStatus })
    .eq('id', orderId)
    .eq('organization_id', orgId)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string; paymentId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { orderId, paymentId } = await params

    const { error } = await supabaseAdmin
      .from('haraka_order_payments')
      .delete()
      .eq('id', paymentId)
      .eq('order_id', orderId)
      .eq('organization_id', tenant.organizationId)
    if (error) throw error

    await recalcOrder(tenant.organizationId, orderId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[DELETE /api/haraka/orders/[orderId]/payments/[paymentId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
