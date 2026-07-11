import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { rateLimitTenant } from '@/lib/rate-limit'
import { requirePermission } from '@/lib/permissions/require'
import { AssetsService } from '@/lib/modules/assets/services/assets.service'
import { createAssetSchema } from '@/lib/modules/assets/validators/schemas'

const service = new AssetsService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'assets')
    requirePermission(tenant.user, 'assets', 'view')
    const limited = await rateLimitTenant(tenant, 'assets', 60, 60_000)
    if (limited) return limited
    const { searchParams } = new URL(req.url)

    if (searchParams.get('categoriesOnly') === 'true') {
      const categories = await service.getCategories(tenant)
      return NextResponse.json({ categories })
    }

    const result = await service.getAll(tenant, {
      status: searchParams.get('status') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined,
      sortBy: searchParams.get('sortBy') as never ?? undefined,
      sortDir: searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc',
    })
    return NextResponse.json(result)
  } catch (err) {
    return err instanceof NextResponse ? err : NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'assets')
    requirePermission(tenant.user, 'assets', 'create')
    const parsed = createAssetSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return NextResponse.json(await service.create(tenant, parsed.data as any), { status: 201 })
  } catch (err) {
    return err instanceof NextResponse ? err : NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
