import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requirePermission } from '@/lib/permissions/require'
import { TaxRatesService } from '@/lib/modules/haraka/tax/tax-rates.service'
import { taxRateUpdateSchema } from '@/lib/modules/haraka/tax/schemas'

const service = new TaxRatesService()

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taxRateId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    requirePermission(tenant.user, 'settings', 'taxRates')
    const { taxRateId } = await params
    const body = await req.json()
    const parsed = taxRateUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    await service.update(tenant, taxRateId, parsed.data)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/haraka/tax-rates/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taxRateId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    requirePermission(tenant.user, 'settings', 'taxRates')
    const { taxRateId } = await params
    await service.delete(tenant, taxRateId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[DELETE /api/haraka/tax-rates/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
