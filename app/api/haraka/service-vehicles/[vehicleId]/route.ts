import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireHarakaModule, requireAddOn } from '@/lib/permissions/require-module'
import { ServiceVehiclesService } from '@/lib/modules/haraka/service-vehicles/service-vehicles.service'
import { updateServiceVehicleSchema } from '@/lib/modules/haraka/service-vehicles/schemas'

const service = new ServiceVehiclesService()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    requireFeature(tenant, 'vehicleIntake')
    await requireHarakaModule(tenant, 'services')
    await requireAddOn(tenant, 'vehicleIntake')
    const { vehicleId } = await params
    const vehicle = await service.getById(tenant, vehicleId)
    return NextResponse.json({ vehicle })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/service-vehicles/[vehicleId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    requireFeature(tenant, 'vehicleIntake')
    await requireHarakaModule(tenant, 'services')
    await requireAddOn(tenant, 'vehicleIntake')
    const { vehicleId } = await params
    const body = await req.json()
    const parsed = updateServiceVehicleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const vehicle = await service.update(tenant, vehicleId, parsed.data)
    return NextResponse.json({ vehicle })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[PATCH /api/haraka/service-vehicles/[vehicleId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
