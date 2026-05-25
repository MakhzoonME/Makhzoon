import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requirePermission } from '@/lib/permissions/require'
import { FawtaraService } from '@/lib/modules/haraka/fawtara/service'

const service = new FawtaraService()

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requirePermission(tenant.user, 'pos', 'fawtara_submit')
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
