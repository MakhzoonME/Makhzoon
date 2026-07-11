import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requirePermission } from '@/lib/permissions/require'
import { TaxRatesService } from '@/lib/modules/haraka/tax/tax-rates.service'
import { taxRateSchema } from '@/lib/modules/haraka/tax/schemas'

const service = new TaxRatesService()

export async function GET() {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const taxRates = await service.list(tenant)
    return NextResponse.json(
      { taxRates },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' } },
    )
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/tax-rates]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    requirePermission(tenant.user, 'settings', 'taxRates')
    const body = await req.json()
    const parsed = taxRateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const result = await service.create(tenant, parsed.data)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/tax-rates]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
