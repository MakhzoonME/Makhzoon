import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const statusSchema = z.object({
  status: z.enum(['in_transit', 'delivered', 'ready_for_pickup', 'picked_up']),
})
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  confirmed:        ['in_transit'],
  assigned:         ['in_transit', 'ready_for_pickup'],
  in_transit:       ['delivered'],
  ready_for_pickup: ['picked_up'],
}

/** POST — public (no auth). Driver marks order as in_transit / delivered / picked_up. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const limited = await checkRateLimit(`delivery-status:ip:${getClientIp(req)}`, 30, 60_000)
    if (limited) return limited

    const { token } = await params
    const parsedBody = statusSchema.safeParse(await req.json().catch(() => null))
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 422 })
    }
    const { status } = parsedBody.data

    const { data: order } = await supabaseAdmin
      .from('haraka_orders')
      .select('id, status, organization_id, delivery_token_expires_at, delivery_token_revoked_at')
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

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? []
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: `Cannot transition from ${order.status} to ${status}` }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('haraka_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('organization_id', order.organization_id)

    if (error) throw error
    return NextResponse.json({ ok: true, status })
  } catch (err) {
    console.error('[POST /api/delivery/[token]/status]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
