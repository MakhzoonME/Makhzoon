import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireAnyVerticalFeature } from '@/lib/permissions/require-feature'
import { requireAddOn } from '@/lib/permissions/require-module'
import { ReportInstancesService } from '@/lib/modules/document-reports/instances.service'
import { updateInstanceSchema } from '@/lib/modules/document-reports/schemas'

const service = new ReportInstancesService()

export async function GET(_req: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const tenant = await resolveTenant()
    requireAnyVerticalFeature(tenant)
    await requireAddOn(tenant, 'documentReports')
    const { reportId } = await params
    const report = await service.getById(tenant, reportId)
    return NextResponse.json({ report })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/document-reports/instances/[reportId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const tenant = await resolveTenant()
    requireAnyVerticalFeature(tenant)
    await requireAddOn(tenant, 'documentReports')
    const { reportId } = await params
    const body = await req.json()
    const parsed = updateInstanceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const report = await service.update(tenant, reportId, parsed.data)
    return NextResponse.json({ report })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/document-reports/instances/[reportId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
