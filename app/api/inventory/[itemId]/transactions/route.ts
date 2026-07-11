import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requirePermission } from '@/lib/permissions/require'
import { InventoryService } from '@/lib/modules/inventory/services/inventory.service'
import { inventoryTransactionSchema } from '@/lib/modules/inventory/validators/schemas'

interface Params { params: Promise<{ itemId: string }> }

const service = new InventoryService()

export async function GET(_req: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'inventory')
    const transactions = await service.getTransactions(tenant, params.itemId)
    return NextResponse.json({ transactions })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/inventory/[itemId]/transactions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'inventory')
    requirePermission(tenant.user, 'inventory', 'transactions')
    const body = await req.json()
    const parsed = inventoryTransactionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

    const { type, quantity, reason, note } = parsed.data
    const result = await service.applyTransaction(tenant, params.itemId, type, quantity, reason, note)

    return NextResponse.json({ quantityAfter: result.quantityAfter }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error && err.message === 'Insufficient stock')
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 })
    console.error('[POST /api/inventory/[itemId]/transactions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
