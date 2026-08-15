import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireHarakaModule, requireAddOn } from '@/lib/permissions/require-module'
import { ServiceVehiclesService } from '@/lib/modules/haraka/service-vehicles/service-vehicles.service'
import { createServiceVehicleSchema } from '@/lib/modules/haraka/service-vehicles/schemas'

const service = new ServiceVehiclesService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    requireFeature(tenant, 'vehicleIntake')
    await requireHarakaModule(tenant, 'services')
    await requireAddOn(tenant, 'vehicleIntake')
    const params = new URL(req.url).searchParams
    const items = await service.list(tenant, {
      search:     params.get('plate') ?? undefined,
      customerId: params.get('customerId') ?? undefined,
    })
    return NextResponse.json({ items })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/service-vehicles]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    requireFeature(tenant, 'vehicleIntake')
    await requireHarakaModule(tenant, 'services')
    await requireAddOn(tenant, 'vehicleIntake')
    const body = await req.json()
    const parsed = createServiceVehicleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    // find-or-create by plate — matches whatever's already on file rather
    // than creating a duplicate vehicle row for the same car.
    const { vehicle, isNew } = await service.findOrCreateByPlate(tenant, parsed.data.plateNumber, {
      customerId: parsed.data.customerId,
      make:       parsed.data.make,
      model:      parsed.data.model,
      color:      parsed.data.color,
      notes:      parsed.data.notes,
    })
    return NextResponse.json({ vehicle, isNew }, { status: isNew ? 201 : 200 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[POST /api/haraka/service-vehicles]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
