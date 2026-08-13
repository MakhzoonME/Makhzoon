import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireAddOn } from '@/lib/permissions/require-module'
import { rateLimitTenant } from '@/lib/rate-limit'
import { PlatformNotificationConfigRepository } from '@/lib/platform/notification-config.repository'
import { recognizePlate } from '@/lib/modules/haraka/service-vehicles/plate-ocr'
import { ocrPlateRequestSchema } from '@/lib/modules/haraka/service-vehicles/schemas'

const configRepo = new PlatformNotificationConfigRepository()

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    requireFeature(tenant, 'vehicleIntake')
    await requireAddOn(tenant, 'vehicleIntake')
    // Cheap per-request cost to the org (OCR provider bills per call) —
    // rate-limit harder than a normal read endpoint.
    const limited = await rateLimitTenant(tenant, 'haraka-plate-ocr', 30, 60_000)
    if (limited) return limited

    const body = await req.json()
    const parsed = ocrPlateRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const cfg = await configRepo.getWithSecrets()
    if (!cfg?.ocrApiKey) {
      return NextResponse.json(
        { error: 'Plate OCR is not configured — ask a superadmin to set it up under Superadmin → Notifications' },
        { status: 409 },
      )
    }

    const result = await recognizePlate(cfg.ocrApiKey, {
      dataUri:  parsed.data.imageDataUri,
      imageUrl: parsed.data.imageUrl,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[POST /api/haraka/service-vehicles/ocr]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
