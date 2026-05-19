import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { TransactionsService } from '@/lib/modules/haraka/transactions/transactions.service'

const service = new TransactionsService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { transactionId } = await params
    const tx = await service.getById(tenant, transactionId)
    return NextResponse.json({ transaction: tx })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/transactions/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
