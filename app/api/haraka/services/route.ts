import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { rateLimitTenant } from '@/lib/rate-limit'
import { ServicesService } from '@/lib/modules/haraka/services/services.service'
import { createServiceSchema } from '@/lib/modules/haraka/services/schemas'

const service = new ServicesService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const limited = await rateLimitTenant(tenant, 'haraka-services', 120, 60_000)
    if (limited) return limited
    const { searchParams } = new URL(req.url)

    if (searchParams.get('categoriesOnly') === 'true') {
      const categories = await service.getCategories(tenant)
      return NextResponse.json({ categories })
    }

    const result = await service.list(tenant, {
      search:   searchParams.get('search')   ?? undefined,
      active:   searchParams.get('active') === 'true' ? true : searchParams.get('active') === 'false' ? false : undefined,
      category: searchParams.get('category') ?? undefined,
      page:     searchParams.get('page')     ? parseInt(searchParams.get('page')!, 10)     : undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined,
    })
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/services]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const body = await req.json()
    const parsed = createServiceSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    const d = parsed.data
    const result = await service.create(tenant, {
      name:        d.name,
      category:    d.category ?? null,
      description: d.description ?? null,
      price:       d.price,
      taxRateId:   d.taxRateId || null,
      active:      d.active,
    })
    return NextResponse.json({ service: result }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/services]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
