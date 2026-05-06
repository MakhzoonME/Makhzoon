import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { InventoryService } from '@/lib/modules/inventory/services/inventory.service'
import { createInventoryItemSchema } from '@/lib/modules/inventory/validators/schemas'

interface Params { params: { itemId: string } }

const service = new InventoryService()

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const tenant = await resolveTenant()
    const item = await service.getById(tenant, params.itemId)
    return NextResponse.json(item)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/inventory/[itemId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const tenant = await resolveTenant()
    const body = await req.json()
    const parsed = createInventoryItemSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

    const data = parsed.data
    await service.update(tenant, params.itemId, {
      name: data.name,
      category: data.category,
      sku: data.sku || undefined,
      unit: data.unit,
      minimumThreshold: data.minimumThreshold,
      reorderQuantity: data.reorderQuantity ? Number(data.reorderQuantity) : undefined,
      location: data.location || undefined,
      supplier: data.supplier || undefined,
      unitCost: data.unitCost ? Number(data.unitCost) : undefined,
      notes: data.notes || undefined,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/inventory/[itemId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const tenant = await resolveTenant()
    await service.delete(tenant, params.itemId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[DELETE /api/inventory/[itemId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
