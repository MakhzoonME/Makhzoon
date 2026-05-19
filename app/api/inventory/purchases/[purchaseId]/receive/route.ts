import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requirePermission } from '@/lib/permissions/require'
import { PurchasesService } from '@/lib/modules/inventory/purchases/purchases.service'

const service = new PurchasesService()

/**
 * POST /api/inventory/purchases/[purchaseId]/receive
 *
 * Marks a draft purchase as received and writes per-line stock-IN transactions
 * atomically. Requires the `purchases.receive` permission.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ purchaseId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requirePermission(tenant.user, 'purchases', 'receive')
    const { purchaseId } = await params
    const result = await service.receive(tenant, purchaseId)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[POST /api/inventory/purchases/[id]/receive]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
