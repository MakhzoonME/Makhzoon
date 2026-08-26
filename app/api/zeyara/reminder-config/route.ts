import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import {
  ReminderConfigService,
  reminderConfigSchema,
} from '@/lib/modules/zeyara/reminders/reminder-config.service'

const service = new ReminderConfigService()

export async function GET() {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'zeyara')
    const config = await service.get(tenant)
    return NextResponse.json({ config })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/zeyara/reminder-config]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'zeyara')
    const body = await req.json()
    const parsed = reminderConfigSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const config = await service.update(tenant, parsed.data)
    return NextResponse.json({ config })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/zeyara/reminder-config]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
