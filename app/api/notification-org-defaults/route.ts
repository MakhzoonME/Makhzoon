import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { hasPermission } from '@/lib/platform/permissions'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { z } from 'zod'

const updateSchema = z.array(z.object({
  eventType:    z.string().min(1),
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  notifyRoles:  z.array(z.string()).min(1),
}))

export async function GET() {
  try {
    const tenant = await resolveTenant()
    const { data, error } = await supabaseAdmin
      .from('notification_org_defaults')
      .select('*')
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
    return NextResponse.json({ defaults: data ?? [] })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/notification-org-defaults]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    if (!hasPermission(tenant, 'settings', 'orgInfo')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const rows = parsed.data.map((d) => ({
      organization_id: tenant.organizationId,
      event_type:      d.eventType,
      in_app_enabled:  d.inAppEnabled,
      email_enabled:   d.emailEnabled,
      notify_roles:    d.notifyRoles,
    }))
    const { error } = await supabaseAdmin
      .from('notification_org_defaults')
      .upsert(rows, { onConflict: 'organization_id,event_type' })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/notification-org-defaults]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
