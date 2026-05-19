import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requirePermission } from '@/lib/permissions/require'
import { SessionsService } from '@/lib/modules/haraka/sessions/sessions.service'
import { openSessionSchema } from '@/lib/modules/haraka/sessions/schemas'

const service = new SessionsService()

/**
 * GET /api/haraka/sessions
 *
 * Supports ?status=open|closed, ?cashierId=…, pagination.
 * Special path: ?mine=current returns the caller's open session (or null).
 */
export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const { searchParams } = new URL(req.url)

    if (searchParams.get('mine') === 'current') {
      const session = await service.findOpen(tenant)
      return NextResponse.json({ session })
    }

    const status = searchParams.get('status')
    const result = await service.list(tenant, {
      status: status === 'open' || status === 'closed' ? status : undefined,
      cashierId: searchParams.get('cashierId') ?? undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/sessions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requirePermission(tenant.user, 'pos', 'open_session')
    const body = await req.json()
    const parsed = openSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const result = await service.open(tenant, parsed.data)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[POST /api/haraka/sessions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
