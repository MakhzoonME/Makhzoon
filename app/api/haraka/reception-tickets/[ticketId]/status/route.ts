import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { ReceptionTicketsService } from '@/lib/modules/haraka/reception-tickets/reception-tickets.service'
import { cancelTicketSchema } from '@/lib/modules/haraka/reception-tickets/schemas'

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
    const body = await req.json()
    const parsed = cancelTicketSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const ticket = await service.cancel(tenant, ticketId)
    return NextResponse.json({ ticket })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[POST /api/haraka/reception-tickets/[ticketId]/status]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
