import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireHarakaModule } from '@/lib/permissions/require-module'
import { StaffService } from '@/lib/modules/haraka/staff/staff.service'
import { staffAvailabilitySchema } from '@/lib/modules/haraka/staff/schemas'

const service = new StaffService()

/** Weekly working hours + the exception list, in one payload — the editor
 *  renders both together. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireHarakaModule(tenant, 'appointments')
    const { staffId } = await params
    const availability = await service.listAvailability(tenant, staffId)
    return NextResponse.json(availability)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/staff/[staffId]/availability]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireHarakaModule(tenant, 'appointments')
    const { staffId } = await params
    const body = await req.json()
    const parsed = staffAvailabilitySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const availability = await service.addAvailability(tenant, staffId, parsed.data)
    return NextResponse.json({ availability }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/staff/[staffId]/availability]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireHarakaModule(tenant, 'appointments')
    const { staffId } = await params
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 422 })
    await service.removeAvailability(tenant, staffId, id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[DELETE /api/haraka/staff/[staffId]/availability]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
