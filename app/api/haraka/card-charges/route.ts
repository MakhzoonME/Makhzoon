import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { rateLimitTenant } from '@/lib/rate-limit'
import { CardTerminalService } from '@/lib/modules/haraka/card-terminal/card-terminal.service'
import { initiateChargeSchema } from '@/lib/modules/haraka/card-terminal/schemas'

const service = new CardTerminalService()

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const limited = rateLimitTenant(tenant, 'card-charges', 60, 60_000)
    if (limited) return limited
    const body = await req.json()
    const parsed = initiateChargeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const config = await service.getConfig(tenant)
    const charge = await service.initiateCharge(tenant, {
      reference: parsed.data.reference,
      amount:    parsed.data.amount,
      currency:  parsed.data.currency ?? config.currency,
    })
    return NextResponse.json({ charge }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[POST /api/haraka/card-charges]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
