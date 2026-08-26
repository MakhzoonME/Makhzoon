import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireAnyVerticalFeature } from '@/lib/permissions/require-feature'
import { requireHarakaModule } from '@/lib/permissions/require-module'
import { rateLimitTenant } from '@/lib/rate-limit'
import { AppointmentsService } from '@/lib/modules/haraka/appointments/appointments.service'
import { createAppointmentSchema } from '@/lib/modules/haraka/appointments/schemas'

const service = new AppointmentsService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireAnyVerticalFeature(tenant)
    await requireHarakaModule(tenant, 'appointments')
    const limited = await rateLimitTenant(tenant, 'haraka-appointments', 120, 60_000)
    if (limited) return limited

    const { searchParams } = new URL(req.url)
    const result = await service.list(tenant, {
      status:    searchParams.get('status')    ?? undefined,
      staffId:   searchParams.get('staffId')   ?? undefined,
      serviceId: searchParams.get('serviceId') ?? undefined,
      // The calendar passes a half-open [from, to) instant range.
      from:      searchParams.get('from')      ?? undefined,
      to:        searchParams.get('to')        ?? undefined,
      page:      searchParams.get('page')     ? parseInt(searchParams.get('page')!, 10)     : undefined,
      pageSize:  searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/appointments]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireAnyVerticalFeature(tenant)
    await requireHarakaModule(tenant, 'appointments')
    const body = await req.json()
    const parsed = createAppointmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const appointment = await service.create(tenant, parsed.data)
    return NextResponse.json({ appointment }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/appointments]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
