import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireAnyVerticalFeature } from '@/lib/permissions/require-feature'
import { requireAddOn } from '@/lib/permissions/require-module'
import { ReportTemplatesService } from '@/lib/modules/document-reports/templates.service'
import { createTemplateSchema } from '@/lib/modules/document-reports/schemas'

const service = new ReportTemplatesService()

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireAnyVerticalFeature(tenant)
    await requireAddOn(tenant, 'documentReports')
    const params = new URL(req.url).searchParams
    const items = await service.list(tenant, { activeOnly: params.get('activeOnly') === 'true' })
    return NextResponse.json({ items })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/document-reports/templates]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    requireAnyVerticalFeature(tenant)
    await requireAddOn(tenant, 'documentReports')
    const body = await req.json()
    const parsed = createTemplateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const template = await service.create(tenant, parsed.data)
    return NextResponse.json({ template }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/document-reports/templates]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
