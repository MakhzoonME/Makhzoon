import { NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const tenant = await resolveTenant()
    const now = new Date().toISOString()
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true, read_at: now })
      .eq('organization_id', tenant.organizationId)
      .eq('recipient_id', tenant.userId)
      .eq('is_read', false)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/notifications/read-all]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
