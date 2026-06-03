import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { rateLimitTenant } from '@/lib/rate-limit'
import { requirePermission } from '@/lib/permissions/require'
import { TransactionsService } from '@/lib/modules/haraka/transactions/transactions.service'
import { completeSaleSchema } from '@/lib/modules/haraka/transactions/schemas'

const service = new TransactionsService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const limited = rateLimitTenant(tenant, 'haraka-transactions', 120, 60_000)
    if (limited) return limited
    const { searchParams } = new URL(req.url)
    const result = await service.list(tenant, {
      sessionId: searchParams.get('sessionId') ?? undefined,
      status: (searchParams.get('status') as 'completed' | 'refunded' | 'voided' | null) ?? undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/transactions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requirePermission(tenant.user, 'pos', 'process_sale')
    const body = await req.json()
    const parsed = completeSaleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data
    const tx = await service.completeSale(tenant, {
      sessionId: d.sessionId,
      customerId: d.customerId ?? null,
      customerName: d.customerName ?? null,
      offlineId: d.offlineId,
      lines: d.lines.map((l) => ({
        itemId: l.itemId,
        itemName: l.itemName,
        sku: l.sku ?? null,
        barcode: l.barcode ?? null,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRateId: l.taxRateId ?? null,
        taxRate: l.taxRate,
        discount: l.discount,
      })),
      payments: d.payments.map((p) => ({
        method: p.method,
        amount: p.amount,
        reference: p.reference ?? null,
        cardLast4: p.cardLast4 || null,
      })),
      skipFawtara: d.skipFawtara ?? false,
    })
    return NextResponse.json({ transaction: tx }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[POST /api/haraka/transactions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
