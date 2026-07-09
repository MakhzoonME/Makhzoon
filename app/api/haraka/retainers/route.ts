import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { rateLimitTenant } from '@/lib/rate-limit'
import { RetainersService } from '@/lib/modules/haraka/retainers/retainers.service'
import { createRetainerSchema } from '@/lib/modules/haraka/retainers/schemas'

const service = new RetainersService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const limited = await rateLimitTenant(tenant, 'haraka-retainers', 120, 60_000)
    if (limited) return limited
    const { searchParams } = new URL(req.url)
    const result = await service.list(tenant, {
      status:   searchParams.get('status')   ?? undefined,
      page:     searchParams.get('page')     ? parseInt(searchParams.get('page')!, 10)     : undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/retainers]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const body = await req.json()
    const parsed = createRetainerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data
    const retainer = await service.create(tenant, {
      name:             d.name,
      customerName:     d.customerName,
      customerPhone:    d.customerPhone ?? null,
      customerId:       d.customerId ?? null,
      staffMemberId:    d.staffMemberId ?? null,
      staffMemberName:  d.staffMemberName ?? null,
      billingCycle:     d.billingCycle,
      amountPerCycle:   d.amountPerCycle,
      taxRate:          d.taxRate,
      startDate:        d.startDate,
      endDate:          d.endDate ?? null,
      notes:            d.notes ?? null,
    })
    return NextResponse.json({ retainer }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[POST /api/haraka/retainers]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
