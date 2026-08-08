import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireHarakaModule } from '@/lib/permissions/require-module'
import { ServiceNotificationConfigRepository } from '@/lib/modules/haraka/service-notifications/notification-config.repository'
import { serviceNotificationConfigPatchSchema } from '@/lib/modules/haraka/service-notifications/schemas'

const repo = new ServiceNotificationConfigRepository()

export async function GET() {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireHarakaModule(tenant, 'services')
    const config = await repo.get(tenant)
    return NextResponse.json({ config })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/service-notification-config]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireHarakaModule(tenant, 'services')
    const body = await req.json()
    const parsed = serviceNotificationConfigPatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const config = await repo.upsert(tenant, parsed.data)
    return NextResponse.json({ config })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/haraka/service-notification-config]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
