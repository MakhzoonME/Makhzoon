import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireAddOn } from '@/lib/permissions/require-module'
import { LoyaltyService } from '@/lib/modules/loyalty/loyalty.service'

const service = new LoyaltyService()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'loyalty')
    await requireAddOn(tenant, 'loyalty')
    const { memberId } = await params
    const transactions = await service.listTransactions(tenant, memberId)
    return NextResponse.json({ transactions })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/loyalty/members/[memberId]/transactions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
