import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { rateLimitTenant } from '@/lib/rate-limit'
import { DiscountApprovalService } from '@/lib/modules/haraka/discount-approval/discount-approval.service'
import { setDiscountPinSchema } from '@/lib/modules/haraka/discount-approval/schemas'

const service = new DiscountApprovalService()

// GET — whether the current user (an approver) has a PIN set yet.
export async function GET() {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const hasPin = await service.hasPin(tenant)
    return NextResponse.json({ hasPin })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/discount-approval/pin]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT — set/change (pin: string) or clear (pin: null) the caller's own PIN.
export async function PUT(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const limited = await rateLimitTenant(tenant, 'discount-pin-set', 10, 60_000)
    if (limited) return limited
    const body = await req.json()
    const parsed = setDiscountPinSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    if (parsed.data.pin === null) {
      await service.clearPin(tenant)
    } else {
      await service.setPin(tenant, parsed.data.pin)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PUT /api/haraka/discount-approval/pin]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
