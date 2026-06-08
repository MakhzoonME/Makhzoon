import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { WarrantyCertsService } from '@/lib/modules/haraka/warranty-certs/warranty-certs.service'
import { warrantyConfigSchema } from '@/lib/modules/haraka/warranty-certs/schemas'

const service = new WarrantyCertsService()

export async function GET() {
  try {
    const tenant = await resolveTenant()
    const config = await service.getConfig(tenant.organizationId)
    return NextResponse.json({ config })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/warranty-config]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const body = await req.json()
    const parsed = warrantyConfigSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const config = await service.updateConfig(tenant, parsed.data)
    return NextResponse.json({ config })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/haraka/warranty-config]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
