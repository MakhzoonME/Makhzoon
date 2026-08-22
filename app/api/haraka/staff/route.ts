import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireStaffAccess } from '@/lib/permissions/require-module'
import { rateLimitTenant } from '@/lib/rate-limit'
import { StaffService } from '@/lib/modules/haraka/staff/staff.service'
import { staffSchema, staffCapabilitySchema } from '@/lib/modules/haraka/staff/schemas'

const service = new StaffService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireStaffAccess(tenant)
    const limited = await rateLimitTenant(tenant, 'haraka-staff', 60, 60_000)
    if (limited) return limited

    const { searchParams } = new URL(req.url)
    const rawCapability = searchParams.get('capability')
    const capability = rawCapability
      ? staffCapabilitySchema.safeParse(rawCapability)
      : null
    if (capability && !capability.success) {
      return NextResponse.json({ error: 'Unknown capability' }, { status: 422 })
    }

    const items = await service.list(tenant, {
      onlyActive: searchParams.get('active') === 'true',
      capability: capability?.success ? capability.data : undefined,
    })
    return NextResponse.json({ items })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/staff]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireStaffAccess(tenant)
    const body = await req.json()
    const parsed = staffSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const staff = await service.create(tenant, parsed.data)
    return NextResponse.json({ staff }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/staff]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
