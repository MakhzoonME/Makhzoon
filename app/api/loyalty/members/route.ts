import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireAddOn } from '@/lib/permissions/require-module'
import { LoyaltyService } from '@/lib/modules/loyalty/loyalty.service'
import { enrollMemberSchema } from '@/lib/modules/loyalty/schemas'

const service = new LoyaltyService()

/** Enroll a customer (or return their existing membership, idempotent). */
export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'loyalty')
    await requireAddOn(tenant, 'loyalty')
    const body = await req.json()
    const parsed = enrollMemberSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const member = await service.getOrEnrollMember(tenant, parsed.data.customerId)
    return NextResponse.json({ member })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/loyalty/members]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
