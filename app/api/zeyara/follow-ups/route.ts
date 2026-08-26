import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { VisitsService } from '@/lib/modules/zeyara/visits/visits.service'

const service = new VisitsService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'zeyara')
    const { searchParams } = new URL(req.url)
    const result = await service.listFollowUps(tenant, {
      // Defaults to the next 30 days in the repository.
      through:  searchParams.get('through')  ?? undefined,
      page:     searchParams.get('page')     ? parseInt(searchParams.get('page')!, 10)     : undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/zeyara/follow-ups]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
