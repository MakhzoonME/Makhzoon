import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requirePermission } from '@/lib/permissions/require'
import { TransactionsService } from '@/lib/modules/haraka/transactions/transactions.service'

const service = new TransactionsService()

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requirePermission(tenant.user, 'pos', 'void_transaction')
    const { transactionId } = await params
    await service.voidSale(tenant, transactionId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[POST /api/haraka/transactions/[id]/void]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
