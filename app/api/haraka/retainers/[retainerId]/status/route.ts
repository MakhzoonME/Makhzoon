import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { RetainersService } from '@/lib/modules/haraka/retainers/retainers.service'
import { updateRetainerStatusSchema } from '@/lib/modules/haraka/retainers/schemas'

const service = new RetainersService()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ retainerId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { retainerId } = await params
    const body = await req.json()
    const parsed = updateRetainerStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const retainer = await service.updateStatus(tenant, retainerId, parsed.data.status)
    return NextResponse.json({ retainer })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[POST /api/haraka/retainers/[retainerId]/status]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
