import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requirePermission } from '@/lib/permissions/require'
import { InventoryService } from '@/lib/modules/inventory/services/inventory.service'
import { createInventoryItemSchema } from '@/lib/modules/inventory/validators/schemas'

const service = new InventoryService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const { searchParams } = new URL(req.url)

    if (searchParams.get('categoriesOnly') === 'true') {
      const categories = await service.getCategories(tenant)
      return NextResponse.json({ categories })
    }

    const items = await service.getAll(tenant, {
      category: searchParams.get('category') ?? undefined,
      stockStatus: searchParams.get('stockStatus') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      posEnabled: searchParams.get('posEnabled') === 'true' ? true : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined,
      sortBy: searchParams.get('sortBy') as never ?? undefined,
      sortDir: searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc',
    })
    return NextResponse.json(items, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/inventory]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requirePermission(tenant.user, 'inventory', 'create')
    const body = await req.json()
    const parsed = createInventoryItemSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

    const data = parsed.data
    const result = await service.create(tenant, {
      name: data.name,
      category: data.category,
      sku: data.sku || undefined,
      unit: data.unit,
      quantityOnHand: data.quantityOnHand,
      minimumThreshold: data.minimumThreshold,
      reorderQuantity: data.reorderQuantity ? Number(data.reorderQuantity) : undefined,
      location: data.location || undefined,
      supplier: data.supplier || undefined,
      unitCost: data.unitCost ? Number(data.unitCost) : undefined,
      notes: data.notes || undefined,
      barcode: data.barcode ? data.barcode.trim() : null,
      posEnabled: data.posEnabled ?? undefined,
      posPrice: data.posPrice ? Number(data.posPrice) : null,
      taxRateId: data.taxRateId || null,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/inventory]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
