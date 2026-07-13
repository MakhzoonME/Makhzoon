import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { ServicesService } from '@/lib/modules/haraka/services/services.service'
import { updateServiceSchema } from '@/lib/modules/haraka/services/schemas'

const service = new ServicesService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { serviceId } = await params
    const result = await service.getById(tenant, serviceId)
    return NextResponse.json({ service: result })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/services/[serviceId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { serviceId } = await params
    const body = await req.json()
    const parsed = updateServiceSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    const d = parsed.data
    const result = await service.update(tenant, serviceId, {
      ...d,
      taxRateId: d.taxRateId === undefined ? undefined : d.taxRateId || null,
    })
    return NextResponse.json({ service: result })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/haraka/services/[serviceId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { serviceId } = await params
    await service.delete(tenant, serviceId)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[DELETE /api/haraka/services/[serviceId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
