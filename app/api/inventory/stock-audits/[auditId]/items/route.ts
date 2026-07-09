import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { StockAuditService } from '@/lib/modules/inventory/services/stock-audit.service'
import { submitStockAuditItemSchema } from '@/lib/modules/inventory/validators/stock-audit.schemas'

const service = new StockAuditService()

interface Params {
  params: Promise<{ auditId: string }>
}

export async function POST(req: NextRequest, props: Params) {
  const params = await props.params
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'inventory')
    const body = await req.json()
    const parsed = submitStockAuditItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    await service.submitItem(
      tenant,
      params.auditId,
      parsed.data.auditItemId,
      parsed.data.countedQuantity,
      parsed.data.note,
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/inventory/stock-audits/[auditId]/items]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
