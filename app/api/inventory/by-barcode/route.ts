import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { hasPermission } from '@/lib/permissions'
import { InventoryService } from '@/lib/modules/inventory/services/inventory.service'

const service = new InventoryService()

/**
 * GET /api/inventory/by-barcode?code=<barcode>&posLookup=true
 *
 * Resolves a barcode to the matching inventory item in the caller's organization.
 * Returns 404 (not 422) on miss so the UI can offer a "create item" fallback
 * without treating it as an error. Used by:
 *   - Raseed list page quick-jump (inventory.view required)
 *   - Purchase line editor scan-to-fill (inventory.view required)
 *   - Haraka register scan-to-add-to-cart (`posLookup=true` — accepts
 *     `pos.add_receipt_items` instead of full Inventory-module access,
 *     scoped to posEnabled items only)
 */
export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const { searchParams } = new URL(req.url)
    const posLookup = searchParams.get('posLookup') === 'true'

    if (posLookup && !hasPermission(tenant.user, 'inventory', 'view')) {
      requireFeature(tenant, 'pos')
    } else {
      requireFeature(tenant, 'inventory')
    }

    const code = (searchParams.get('code') ?? '').trim()
    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 })
    }

    const item = await service.findByBarcode(tenant, code, { posLookup })
    if (!item) {
      return NextResponse.json({ error: 'No item with that barcode' }, { status: 404 })
    }
    return NextResponse.json({ item })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/inventory/by-barcode]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
