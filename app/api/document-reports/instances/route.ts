import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireAddOn } from '@/lib/permissions/require-module'
import { ReportInstancesService } from '@/lib/modules/document-reports/instances.service'
import { createInstanceSchema } from '@/lib/modules/document-reports/schemas'
import type { ReportEncounterType } from '@/types'

const service = new ReportInstancesService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireAddOn(tenant, 'documentReports')
    const params = new URL(req.url).searchParams
    const result = await service.list(tenant, {
      customerId:    params.get('customerId') ?? undefined,
      templateId:    params.get('templateId') ?? undefined,
      encounterType: (params.get('encounterType') as ReportEncounterType) ?? undefined,
      encounterId:   params.get('encounterId') ?? undefined,
      page:          params.get('page') ? Number(params.get('page')) : undefined,
      pageSize:      params.get('pageSize') ? Number(params.get('pageSize')) : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/document-reports/instances]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireAddOn(tenant, 'documentReports')
    const body = await req.json()
    const parsed = createInstanceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const report = await service.create(tenant, parsed.data)
    return NextResponse.json({ report }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/document-reports/instances]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
