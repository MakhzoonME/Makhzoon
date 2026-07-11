import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { RetainersService } from '@/lib/modules/haraka/retainers/retainers.service'
import { updateRetainerSchema } from '@/lib/modules/haraka/retainers/schemas'

const service = new RetainersService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ retainerId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { retainerId } = await params
    const retainer = await service.getById(tenant, retainerId)
    return NextResponse.json({ retainer })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/retainers/[retainerId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ retainerId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { retainerId } = await params
    const body = await req.json()
    const parsed = updateRetainerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const retainer = await service.update(tenant, retainerId, parsed.data)
    return NextResponse.json({ retainer })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[PATCH /api/haraka/retainers/[retainerId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ retainerId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { retainerId } = await params
    await service.delete(tenant, retainerId)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[DELETE /api/haraka/retainers/[retainerId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
