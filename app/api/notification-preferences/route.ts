import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const updateSchema = z.array(z.object({
  eventType: z.string().min(1),
  inApp:     z.boolean(),
  email:     z.boolean(),
}))

export async function GET() {
  try {
    const tenant = await resolveTenant()
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('organization_id,user_id,event_type,in_app,email')
      .eq('organization_id', tenant.organizationId)
      .eq('user_id', tenant.userId)
    if (error) throw error
    const preferences = (data ?? []).map((row) => ({
      organizationId: row.organization_id,
      userId: row.user_id,
      eventType: row.event_type,
      inApp: row.in_app,
      email: row.email,
    }))
    return NextResponse.json({ preferences })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/notification-preferences]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const rows = parsed.data.map((p) => ({
      organization_id: tenant.organizationId,
      user_id:         tenant.userId,
      event_type:      p.eventType,
      in_app:          p.inApp,
      email:           p.email,
    }))
    const { error } = await supabaseAdmin
      .from('notification_preferences')
      .upsert(rows, { onConflict: 'organization_id,user_id,event_type' })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/notification-preferences]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
