import { NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const tenant = await resolveTenant()
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', tenant.organizationId)
      .eq('recipient_id', tenant.userId)
      .eq('is_read', false)
    if (error) throw error
    return NextResponse.json({ count: count ?? 0 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/notifications/unread-count]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
