import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'

const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

/**
 * POST — generate (or return a still-valid existing) delivery token.
 * Expired or revoked tokens are replaced with a fresh one, never resurrected.
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
      .select('delivery_token, delivery_token_expires_at, delivery_token_revoked_at, status')
      .eq('id', orderId)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.status === 'cancelled') return NextResponse.json({ error: 'Cannot share a cancelled order' }, { status: 400 })

    let token = order.delivery_token as string | null
    let expiresAt = order.delivery_token_expires_at as string | null
    const revoked = !!order.delivery_token_revoked_at
    const expired = !expiresAt || new Date(expiresAt).getTime() <= Date.now()

    if (!token || revoked || expired) {
      token = randomBytes(24).toString('hex')
      expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()
      await supabaseAdmin
        .from('haraka_orders')
        .update({
          delivery_token: token,
          delivery_token_expires_at: expiresAt,
          delivery_token_revoked_at: null,
        })
        .eq('id', orderId)
        .eq('organization_id', tenant.organizationId)
    }

    return NextResponse.json({ token, expiresAt })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/orders/[orderId]/delivery-token]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE — revoke the current delivery link immediately. */
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
      .select('delivery_token')
      .eq('id', orderId)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    await supabaseAdmin
      .from('haraka_orders')
      .update({ delivery_token_revoked_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('organization_id', tenant.organizationId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[DELETE /api/haraka/orders/[orderId]/delivery-token]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
