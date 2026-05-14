import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { TransactionsService } from '@/lib/modules/haraka/transactions/transactions.service'
import { refundSchema } from '@/lib/modules/haraka/transactions/schemas'

const service = new TransactionsService()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { transactionId } = await params
    const body = await req.json().catch(() => ({}))
    const parsed = refundSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const result = await service.refundSale(tenant, transactionId, {
      lineIndexes: parsed.data.lineIndexes,
      reason: parsed.data.reason,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[POST /api/haraka/transactions/[id]/refund]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
