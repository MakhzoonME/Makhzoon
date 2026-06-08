import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { ServiceJobsService } from '@/lib/modules/haraka/service-jobs/service-jobs.service'

const service = new ServiceJobsService()

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { jobId } = await params
    const job = await service.generateInvoice(tenant, jobId)
    return NextResponse.json({ job, invoiceNumber: job.invoiceNumber })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[POST /api/haraka/service-jobs/[jobId]/invoice]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
