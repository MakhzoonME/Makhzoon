import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { rateLimitTenant } from '@/lib/rate-limit'
import { CashDrawerService } from '@/lib/modules/haraka/cash-drawer/cash-drawer.service'
import { verifyPinSchema } from '@/lib/modules/haraka/cash-drawer/schemas'

const service = new CashDrawerService()

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    // 10 attempts per minute — prevents brute force on the 4–6 digit PIN
    const limited = await rateLimitTenant(tenant, 'cash-drawer-pin', 10, 60_000)
    if (limited) return limited
    const body = await req.json()
    const parsed = verifyPinSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const ok = await service.verifyPin(tenant, parsed.data.pin)
    return NextResponse.json({ ok })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/cash-drawer-config/verify-pin]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
