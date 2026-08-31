import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireHarakaModule } from '@/lib/permissions/require-module'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { derivePaymentStatus } from '@/lib/modules/haraka/pricing/calc'

async function recalcOrder(orgId: string, orderId: string) {
  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('amount')
    .eq('reference_type', 'order')
    .eq('reference_id', orderId)
    .eq('organization_id', orgId)
    .eq('status', 'paid')

  const amountPaid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)

  const { data: order } = await supabaseAdmin
    .from('haraka_orders')
    .select('total')
    .eq('id', orderId)
    .eq('organization_id', orgId)
    .maybeSingle()

  const total = Number(order?.total ?? 0)
  const paymentStatus = derivePaymentStatus(total, amountPaid)

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
    await requireHarakaModule(tenant, 'orders')
    const { orderId, paymentId } = await params

    const { error } = await supabaseAdmin
      .from('payments')
      .delete()
      .eq('id', paymentId)
      .eq('reference_type', 'order')
      .eq('reference_id', orderId)
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
