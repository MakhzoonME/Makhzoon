import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { rateLimitTenant } from '@/lib/rate-limit'
import { ServiceJobsService } from '@/lib/modules/haraka/service-jobs/service-jobs.service'
import { createServiceJobSchema } from '@/lib/modules/haraka/service-jobs/schemas'

const service = new ServiceJobsService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const limited = rateLimitTenant(tenant, 'haraka-service-jobs', 120, 60_000)
    if (limited) return limited
    const { searchParams } = new URL(req.url)
    const result = await service.list(tenant, {
      status:        searchParams.get('status')        ?? undefined,
      serviceType:   searchParams.get('serviceType')   ?? undefined,
      staffMemberId: searchParams.get('staffMemberId') ?? undefined,
      from:          searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
      to:            searchParams.get('to')   ? new Date(searchParams.get('to')!)   : undefined,
      page:          searchParams.get('page')     ? parseInt(searchParams.get('page')!, 10)     : undefined,
      pageSize:      searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/service-jobs]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const body = await req.json()
    const parsed = createServiceJobSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data
    const job = await service.create(tenant, {
      serviceType:     d.serviceType ?? null,
      customerName:    d.customerName,
      customerPhone:   d.customerPhone ?? null,
      customerId:      d.customerId ?? null,
      staffMemberId:   d.staffMemberId ?? null,
      staffMemberName: d.staffMemberName ?? null,
      lines:           d.items.map((l) => ({
        itemId:    '',
        itemName:  l.name,
        sku:       null,
        barcode:   null,
        quantity:  l.quantity,
        unitPrice: l.unitPrice,
        taxRateId: null,
        taxRate:   l.taxRate ?? 0,
        discount:  l.discountAmount ?? 0,
      })),
      paymentMethod:   d.paymentMethod ?? null,
      scheduledAt:     d.scheduledAt ?? null,
      serviceAddress:  d.serviceAddress ?? null,
      notes:           d.notes ?? null,
      createdById:     tenant.userId,
    })
    return NextResponse.json({ job }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[POST /api/haraka/service-jobs]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
