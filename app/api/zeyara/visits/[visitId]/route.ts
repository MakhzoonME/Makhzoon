import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { VisitsService } from '@/lib/modules/zeyara/visits/visits.service'
import { updateVisitSchema } from '@/lib/modules/zeyara/visits/schemas'

const service = new VisitsService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'zeyara')
    const { visitId } = await params
    const visit = await service.getById(tenant, visitId)
    return NextResponse.json({ visit })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/zeyara/visits/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'zeyara')
    const { visitId } = await params
    const body = await req.json()
    const parsed = updateVisitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const visit = await service.update(tenant, visitId, parsed.data)
    return NextResponse.json({ visit })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/zeyara/visits/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'zeyara')
    const { visitId } = await params
    await service.delete(tenant, visitId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[DELETE /api/zeyara/visits/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
