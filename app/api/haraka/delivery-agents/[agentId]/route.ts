import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { DeliveryAgentsService } from '@/lib/modules/haraka/delivery-agents/delivery-agents.service'
import { deliveryAgentUpdateSchema } from '@/lib/modules/haraka/delivery-agents/schemas'

const service = new DeliveryAgentsService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { agentId } = await params
    const agent = await service.getById(tenant, agentId)
    return NextResponse.json({ agent })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/delivery-agents/[agentId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { agentId } = await params
    const body = await req.json()
    const parsed = deliveryAgentUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const { name, phone, notes, isActive } = parsed.data
    const agent = await service.update(tenant, agentId, { name, phone, notes, isActive })
    return NextResponse.json({ agent })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/haraka/delivery-agents/[agentId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { agentId } = await params
    await service.delete(tenant, agentId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[DELETE /api/haraka/delivery-agents/[agentId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
