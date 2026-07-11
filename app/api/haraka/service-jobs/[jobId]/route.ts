import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { ServiceJobsService } from '@/lib/modules/haraka/service-jobs/service-jobs.service'
import { updateServiceJobSchema } from '@/lib/modules/haraka/service-jobs/schemas'

const service = new ServiceJobsService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { jobId } = await params
    const job = await service.getById(tenant, jobId)
    return NextResponse.json({ job })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/service-jobs/[jobId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { jobId } = await params
    const body = await req.json()
    const parsed = updateServiceJobSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const job = await service.update(tenant, jobId, parsed.data)
    return NextResponse.json({ job })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[PATCH /api/haraka/service-jobs/[jobId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { jobId } = await params
    await service.delete(tenant, jobId)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 })
    console.error('[DELETE /api/haraka/service-jobs/[jobId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
