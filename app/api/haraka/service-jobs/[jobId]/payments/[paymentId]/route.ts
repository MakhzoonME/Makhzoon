import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { ServiceJobsService } from '@/lib/modules/haraka/service-jobs/service-jobs.service'

const service = new ServiceJobsService()

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string; paymentId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { jobId, paymentId } = await params
    await service.removePayment(tenant, jobId, paymentId)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[DELETE /api/haraka/service-jobs/[jobId]/payments/[paymentId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
