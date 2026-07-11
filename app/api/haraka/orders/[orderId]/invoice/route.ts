import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { allocateHarakaInvoiceNumber } from '@/lib/modules/haraka/orders/invoice-numbering'
import { loadOrderDocument } from '@/lib/modules/haraka/orders/order-document-loader'

/** POST — allocate (or return existing) invoice number for an order. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { orderId } = await params

    // Check if already has a number
    const { data: existing } = await supabaseAdmin
      .from('haraka_orders')
      .select('invoice_number')
      .eq('id', orderId)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    let invoiceNumber = existing.invoice_number as string | null
    if (!invoiceNumber) {
      invoiceNumber = await allocateHarakaInvoiceNumber(tenant.organizationId)
      await supabaseAdmin
        .from('haraka_orders')
        .update({ invoice_number: invoiceNumber })
        .eq('id', orderId)
        .eq('organization_id', tenant.organizationId)
    }

    return NextResponse.json({ invoiceNumber })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/orders/[orderId]/invoice]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** GET — public (no auth) endpoint that returns order + org config for document rendering. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await params
    const orgSlug = req.nextUrl.searchParams.get('org')
    if (!orgSlug) return NextResponse.json({ error: 'org required' }, { status: 400 })

    const result = await loadOrderDocument(orgSlug, orderId)
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Also fetch payment entries
    const { data: payments } = await supabaseAdmin
      .from('haraka_order_payments')
      .select('id, amount, payment_method, note, paid_at')
      .eq('order_id', orderId)
      .eq('organization_id', result.ctx.orgId)
      .order('paid_at', { ascending: true })

    return NextResponse.json({ ...result, payments: payments ?? [] })
  } catch (err) {
    console.error('[GET /api/haraka/orders/[orderId]/invoice]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
