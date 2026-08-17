import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireAddOn } from '@/lib/permissions/require-module'
import { LoyaltyService } from '@/lib/modules/loyalty/loyalty.service'
import { updateLoyaltyProgramSchema } from '@/lib/modules/loyalty/schemas'

const service = new LoyaltyService()

export async function GET() {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'loyalty')
    await requireAddOn(tenant, 'loyalty')
    const program = await service.getProgram(tenant)
    return NextResponse.json({ program })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/loyalty/program]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'loyalty')
    await requireAddOn(tenant, 'loyalty')
    const body = await req.json()
    const parsed = updateLoyaltyProgramSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const program = await service.updateProgram(tenant, parsed.data)
    return NextResponse.json({ program })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/loyalty/program]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
