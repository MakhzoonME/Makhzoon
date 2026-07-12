import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { ServiceJobsService } from '@/lib/modules/haraka/service-jobs/service-jobs.service'
import { addServiceJobItemsSchema } from '@/lib/modules/haraka/service-jobs/schemas'

const service = new ServiceJobsService()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { jobId } = await params
    const body = await req.json()
    const parsed = addServiceJobItemsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const job = await service.addItems(
      tenant,
      jobId,
      parsed.data.items.map((l) => ({
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
    )
    return NextResponse.json({ job })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[POST /api/haraka/service-jobs/[jobId]/items]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
