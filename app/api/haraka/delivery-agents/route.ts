import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { rateLimitTenant } from '@/lib/rate-limit'
import { DeliveryAgentsService } from '@/lib/modules/haraka/delivery-agents/delivery-agents.service'
import { deliveryAgentSchema } from '@/lib/modules/haraka/delivery-agents/schemas'

const service = new DeliveryAgentsService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const limited = await rateLimitTenant(tenant, 'haraka-delivery-agents', 60, 60_000)
    if (limited) return limited
    const onlyActive = new URL(req.url).searchParams.get('active') === 'true'
    const items = await service.list(tenant, onlyActive)
    return NextResponse.json({ items })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/delivery-agents]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const body = await req.json()
    const parsed = deliveryAgentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const { name, phone, notes, isActive } = parsed.data
    const agent = await service.create(tenant, { name, phone, notes, isActive })
    return NextResponse.json({ agent }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/delivery-agents]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
