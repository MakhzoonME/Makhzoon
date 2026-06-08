import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { WarrantyCertsService } from '@/lib/modules/haraka/warranty-certs/warranty-certs.service'

const service = new WarrantyCertsService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ certId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { certId } = await params
    const cert = await service.getById(tenant.organizationId, certId)
    return NextResponse.json({ cert })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/warranty-certs/[certId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ certId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { certId } = await params
    await service.delete(tenant, certId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[DELETE /api/haraka/warranty-certs/[certId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
