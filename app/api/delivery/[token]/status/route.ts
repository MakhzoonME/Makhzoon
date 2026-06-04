import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

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
    const { token } = await params
    const { status } = await req.json() as { status: string }

    const { data: order } = await supabaseAdmin
      .from('haraka_orders')
      .select('id, status, organization_id')
      .eq('delivery_token', token)
      .maybeSingle()

    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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
