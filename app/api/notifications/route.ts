import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const page       = parseInt(searchParams.get('page')     ?? '1',  10)
    const pageSize   = parseInt(searchParams.get('pageSize') ?? '20', 10)

    let q = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .eq('recipient_id', tenant.userId)
      .order('created_at', { ascending: false })

    if (unreadOnly) q = q.eq('is_read', false)

    const { data, error } = await q
    if (error) throw error

    const items     = data ?? []
    const total      = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage   = Math.min(page, totalPages)
    const start      = (safePage - 1) * pageSize

    return NextResponse.json({
      items: items.slice(start, start + pageSize),
      total, page: safePage, pageSize, totalPages,
    })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/notifications]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
