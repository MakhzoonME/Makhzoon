import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireAddOn } from '@/lib/permissions/require-module'
import { ServiceJobsService } from '@/lib/modules/haraka/service-jobs/service-jobs.service'
import { assignServiceJobAgentsSchema } from '@/lib/modules/haraka/service-jobs/schemas'

const service = new ServiceJobsService()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireAddOn(tenant, 'deliveryAgents')
    const { jobId } = await params
    const agents = await service.listAgents(tenant, jobId)
    return NextResponse.json({ agents })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/service-jobs/[jobId]/agents]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireAddOn(tenant, 'deliveryAgents')
    const { jobId } = await params
    const body = await req.json()
    const parsed = assignServiceJobAgentsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const agents = await service.assignAgents(tenant, jobId, parsed.data)
    return NextResponse.json({ agents })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[POST /api/haraka/service-jobs/[jobId]/agents]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
