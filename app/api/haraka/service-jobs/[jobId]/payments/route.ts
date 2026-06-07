import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { ServiceJobsService } from '@/lib/modules/haraka/service-jobs/service-jobs.service'
import { addPaymentEntrySchema } from '@/lib/modules/haraka/service-jobs/schemas'

const service = new ServiceJobsService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { jobId } = await params
    const payments = await service.listPayments(tenant, jobId)
    return NextResponse.json({ payments })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/service-jobs/[jobId]/payments]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { jobId } = await params
    const body = await req.json()
    const parsed = addPaymentEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    await service.addPayment(tenant, jobId, parsed.data.amount, parsed.data.paymentMethod ?? null, parsed.data.note ?? null)
    const payments = await service.listPayments(tenant, jobId)
    return NextResponse.json({ payments }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[POST /api/haraka/service-jobs/[jobId]/payments]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
