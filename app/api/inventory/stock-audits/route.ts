import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { StockAuditService } from '@/lib/modules/inventory/services/stock-audit.service'
import { createStockAuditSchema } from '@/lib/modules/inventory/validators/stock-audit.schemas'

const service = new StockAuditService()

export async function GET() {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'inventory')
    const audits = await service.list(tenant)
    return NextResponse.json({ audits })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/inventory/stock-audits]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'inventory')
    const body = await req.json()
    const parsed = createStockAuditSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const result = await service.create(tenant, parsed.data)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/inventory/stock-audits]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
