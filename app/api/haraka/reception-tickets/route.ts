import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { rateLimitTenant } from '@/lib/rate-limit'
import { ReceptionTicketsService } from '@/lib/modules/haraka/reception-tickets/reception-tickets.service'
import { createTicketSchema } from '@/lib/modules/haraka/reception-tickets/schemas'

const service = new ReceptionTicketsService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    requireFeature(tenant, 'reception')
    const limited = await rateLimitTenant(tenant, 'haraka-reception-tickets', 120, 60_000)
    if (limited) return limited
    const { searchParams } = new URL(req.url)
    const result = await service.list(tenant, {
      status:   searchParams.get('status') ?? undefined,
      search:   searchParams.get('search') ?? undefined,
      page:     searchParams.get('page')     ? parseInt(searchParams.get('page')!, 10)     : undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/reception-tickets]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    requireFeature(tenant, 'reception')
    const body = await req.json()
    const parsed = createTicketSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const ticket = await service.create(tenant, parsed.data)
    return NextResponse.json({ ticket }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[POST /api/haraka/reception-tickets]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
