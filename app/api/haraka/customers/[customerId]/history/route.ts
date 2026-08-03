import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { CustomersService } from '@/lib/modules/haraka/customers/customers.service'

const service = new CustomersService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { customerId } = await params
    const entries = await service.history(tenant, customerId)
    return NextResponse.json({ entries })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/customers/[id]/history]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
