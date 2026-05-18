import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requirePermission } from '@/lib/permissions/require'
import { PurchasesService } from '@/lib/modules/inventory/purchases/purchases.service'
import { createPurchaseSchema } from '@/lib/modules/inventory/purchases/schemas'
import type { PurchaseStatus } from '@/types'

const service = new PurchasesService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const { searchParams } = new URL(req.url)
    const result = await service.list(tenant, {
      status: (searchParams.get('status') as PurchaseStatus | null) ?? undefined,
      search: searchParams.get('search') ?? undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined,
    })
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/inventory/purchases]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requirePermission(tenant.user, 'purchases', 'create')
    const body = await req.json()
    const parsed = createPurchaseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const data = parsed.data
    const result = await service.create(tenant, {
      supplierName: data.supplierName,
      supplierContact: data.supplierContact ?? null,
      invoiceNumber: data.invoiceNumber ?? null,
      invoiceDate: data.invoiceDate,
      notes: data.notes ?? null,
      updateItemUnitCost: data.updateItemUnitCost === true,
      lines: data.lines.map((l) => ({
        itemId: l.itemId ?? null,
        itemName: l.itemName,
        sku: l.sku ?? null,
        barcode: l.barcode ? l.barcode : null,
        quantity: l.quantity,
        unitCost: l.unitCost,
        taxRateId: l.taxRateId || null,
        notes: l.notes ?? null,
      })),
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[POST /api/inventory/purchases]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
