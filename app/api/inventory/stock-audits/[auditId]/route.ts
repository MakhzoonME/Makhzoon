import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { StockAuditService } from '@/lib/modules/inventory/services/stock-audit.service'
import { completeStockAuditSchema } from '@/lib/modules/inventory/validators/stock-audit.schemas'

const service = new StockAuditService()

interface Params {
  params: Promise<{ auditId: string }>
}

export async function GET(_req: NextRequest, props: Params) {
  const params = await props.params
  try {
    const tenant = await resolveTenant()
    const data = await service.getDetail(tenant, params.auditId)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/inventory/stock-audits/[auditId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, props: Params) {
  const params = await props.params
  try {
    const tenant = await resolveTenant()
    const body = await req.json()
    const parsed = completeStockAuditSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const result = await service.complete(tenant, params.auditId, parsed.data.adjustments)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/inventory/stock-audits/[auditId]]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
