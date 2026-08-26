import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { rateLimitTenant } from '@/lib/rate-limit'
import { VisitsService } from '@/lib/modules/zeyara/visits/visits.service'
import { createVisitSchema } from '@/lib/modules/zeyara/visits/schemas'

const service = new VisitsService()

// Clinical records are Zeyara-only — this gate is deliberately the strict
// single-feature check, NOT requireAnyVerticalFeature. A Haraka org has no
// business reaching patient health information.
export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'zeyara')
    const limited = await rateLimitTenant(tenant, 'zeyara-visits', 120, 60_000)
    if (limited) return limited

    const { searchParams } = new URL(req.url)
    const result = await service.list(tenant, {
      customerId:    searchParams.get('customerId')    ?? undefined,
      providerId:    searchParams.get('providerId')    ?? undefined,
      appointmentId: searchParams.get('appointmentId') ?? undefined,
      from:          searchParams.get('from')          ?? undefined,
      to:            searchParams.get('to')            ?? undefined,
      search:        searchParams.get('search')        ?? undefined,
      page:          searchParams.get('page')     ? parseInt(searchParams.get('page')!, 10)     : undefined,
      pageSize:      searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/zeyara/visits]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'zeyara')
    const body = await req.json()
    const parsed = createVisitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const visit = await service.create(tenant, parsed.data)
    return NextResponse.json({ visit }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/zeyara/visits]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
