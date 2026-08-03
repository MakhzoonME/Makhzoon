import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requirePermission } from '@/lib/permissions/require'
import { FawtaraService } from '@/lib/modules/haraka/fawtara/service'

const service = new FawtaraService()

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    // No dedicated permission — JoFotara submission is being automated, so a
    // manual resubmit only requires the baseline ability to view transactions.
    requirePermission(tenant.user, 'haraka', 'transactionsView')
    const { transactionId } = await params
    const submission = await service.resubmit(tenant, transactionId)
    return NextResponse.json({ submission })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[POST /api/jo-fotara/submit/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
