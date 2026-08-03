import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'

const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

/**
 * POST — generate (or return a still-valid existing) customer token.
 *
 * Powers the read-only "Share with customer" link (/track/[token]). Kept
 * separate from the delivery_token so the interactive and read-only links have
 * independent lifecycles. Expired or revoked tokens are replaced, never
 * resurrected.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { orderId } = await params

    const { data: order } = await supabaseAdmin
      .from('haraka_orders')
      .select('customer_token, customer_token_expires_at, customer_token_revoked_at, status')
      .eq('id', orderId)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.status === 'cancelled') return NextResponse.json({ error: 'Cannot share a cancelled order' }, { status: 400 })

    let token = order.customer_token as string | null
    let expiresAt = order.customer_token_expires_at as string | null
    const revoked = !!order.customer_token_revoked_at
    const expired = !expiresAt || new Date(expiresAt).getTime() <= Date.now()

    if (!token || revoked || expired) {
      token = randomBytes(24).toString('hex')
      expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()
      await supabaseAdmin
        .from('haraka_orders')
        .update({
          customer_token: token,
          customer_token_expires_at: expiresAt,
          customer_token_revoked_at: null,
        })
        .eq('id', orderId)
        .eq('organization_id', tenant.organizationId)
    }

    return NextResponse.json({ token, expiresAt })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/orders/[orderId]/customer-token]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE — revoke the current customer link immediately. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { orderId } = await params

    const { data: order } = await supabaseAdmin
      .from('haraka_orders')
      .select('customer_token')
      .eq('id', orderId)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    await supabaseAdmin
      .from('haraka_orders')
      .update({ customer_token_revoked_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('organization_id', tenant.organizationId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[DELETE /api/haraka/orders/[orderId]/customer-token]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
