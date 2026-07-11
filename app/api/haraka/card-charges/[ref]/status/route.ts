import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { CardTerminalService } from '@/lib/modules/haraka/card-terminal/card-terminal.service'
import { z } from 'zod'

const chargeStatusSchema = z.object({
  status: z.enum(['approved', 'declined', 'timeout', 'cancelled']),
  providerRef: z.string().max(200).nullish(),
})

const service = new CardTerminalService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { ref } = await params
    const charge = await service.getChargeStatus(tenant, ref)
    return NextResponse.json({ charge })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/card-charges/[ref]/status]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Allow the local bridge to push a status update directly. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { ref } = await params
    const parsed = chargeStatusSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 422 })
    }
    const body = parsed.data
    const status = body.status
    const charge = await service.updateChargeStatus(tenant, ref, status, body.providerRef ?? null)
    return NextResponse.json({ charge })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/card-charges/[ref]/status]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
