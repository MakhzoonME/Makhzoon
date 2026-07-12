import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { rateLimitTenant } from '@/lib/rate-limit'
import { ReceptionTicketsService } from '@/lib/modules/haraka/reception-tickets/reception-tickets.service'
import { checkoutTicketSchema } from '@/lib/modules/haraka/reception-tickets/schemas'

const service = new ReceptionTicketsService()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const { ticketId } = await params
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    requireFeature(tenant, 'reception')
    const limited = await rateLimitTenant(tenant, 'haraka-reception-checkout', 30, 60_000)
    if (limited) return limited
    const body = await req.json()
    const parsed = checkoutTicketSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const result = await service.checkout(tenant, ticketId, parsed.data)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[POST /api/haraka/reception-tickets/[ticketId]/checkout]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
