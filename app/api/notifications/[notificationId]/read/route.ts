import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { notificationId } = await params
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('organization_id', tenant.organizationId)
      .eq('recipient_id', tenant.userId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/notifications/[id]/read]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
