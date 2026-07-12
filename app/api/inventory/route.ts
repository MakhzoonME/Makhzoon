import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { rateLimitTenant } from '@/lib/rate-limit'
import { requirePermission } from '@/lib/permissions/require'
import { hasPermission } from '@/lib/permissions'
import { InventoryService } from '@/lib/modules/inventory/services/inventory.service'
import { createInventoryItemSchema } from '@/lib/modules/inventory/validators/schemas'

const service = new InventoryService()

/**
 * POS product lookup (register cart): a staff member who can build a
 * receipt (add_receipt_items) but has no Inventory-module access should
 * still be able to read the posEnabled catalog. Full inventory browsing
 * (the default, non-POS-scoped call) still requires the Inventory module.
 */
function requireInventoryReadForPosLookup(tenant: Awaited<ReturnType<typeof resolveTenant>>): void {
  if (hasPermission(tenant.user, 'inventory', 'view')) {
    requireFeature(tenant, 'inventory')
    return
  }
  requireFeature(tenant, 'pos')
  requirePermission(tenant.user, 'pos', 'add_receipt_items')
}

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const { searchParams } = new URL(req.url)
    const posLookup = searchParams.get('posEnabled') === 'true'

    if (posLookup) {
      requireInventoryReadForPosLookup(tenant)
    } else {
      requireFeature(tenant, 'inventory')
      requirePermission(tenant.user, 'inventory', 'view')
    }
    const limited = await rateLimitTenant(tenant, 'inventory', 60, 60_000)
    if (limited) return limited

    if (searchParams.get('categoriesOnly') === 'true') {
      const categories = await service.getCategories(tenant)
      return NextResponse.json({ categories })
    }

    const items = await service.getAll(tenant, {
      category: searchParams.get('category') ?? undefined,
      stockStatus: searchParams.get('stockStatus') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      posEnabled: searchParams.get('posEnabled') === 'true' ? true : undefined,
      itemType: searchParams.get('itemType') === 'product' || searchParams.get('itemType') === 'service'
        ? (searchParams.get('itemType') as 'product' | 'service')
        : undefined,
      expiringWithin: searchParams.get('expiringWithin') ? parseInt(searchParams.get('expiringWithin')!, 10) : undefined,
      expired: searchParams.get('expired') === 'true' ? true : undefined,
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
    requireFeature(tenant, 'inventory')
    requirePermission(tenant.user, 'inventory', 'create')
    const body = await req.json()
    const parsed = createInventoryItemSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

    const data = parsed.data
    const result = await service.create(tenant, {
      name: data.name,
      category: data.category,
      itemType: data.itemType,
      sku: data.sku || undefined,
      unit: data.unit,
      quantityOnHand: data.quantityOnHand,
      minimumThreshold: data.minimumThreshold,
      reorderQuantity: data.reorderQuantity === undefined ? undefined : Number(data.reorderQuantity),
      location: data.location || undefined,
      supplier: data.supplier || undefined,
      unitCost: data.unitCost === undefined ? undefined : Number(data.unitCost),
      notes: data.notes || undefined,
      barcode: data.barcode ? data.barcode.trim() : null,
      posEnabled: data.posEnabled ?? undefined,
      posPrice: data.posPrice === undefined ? null : Number(data.posPrice),
      taxRateId: data.taxRateId || null,
      expiryDate: data.expiryDate || null,
      documents: data.documents ?? [],
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/inventory]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
