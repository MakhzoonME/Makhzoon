import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { CashDrawerService } from '@/lib/modules/haraka/cash-drawer/cash-drawer.service'
import { cashDrawerConfigUpdateSchema } from '@/lib/modules/haraka/cash-drawer/schemas'

const service = new CashDrawerService()

export async function GET() {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const config = await service.getConfig(tenant)
    return NextResponse.json({ config })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/cash-drawer-config]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const body = await req.json()
    const parsed = cashDrawerConfigUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const { pin, ...patch } = parsed.data
    const config = await service.updateConfig(tenant, patch, pin)
    return NextResponse.json({ config })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/haraka/cash-drawer-config]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
