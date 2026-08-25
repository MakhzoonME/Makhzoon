import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireAddOn } from '@/lib/permissions/require-module'
import { ReportTemplatesService } from '@/lib/modules/document-reports/templates.service'
import { updateTemplateSchema } from '@/lib/modules/document-reports/schemas'

const service = new ReportTemplatesService()

export async function GET(_req: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireAddOn(tenant, 'documentReports')
    const { templateId } = await params
    const template = await service.getById(tenant, templateId)
    return NextResponse.json({ template })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/document-reports/templates/[templateId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireAddOn(tenant, 'documentReports')
    const { templateId } = await params
    const body = await req.json()
    const parsed = updateTemplateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const template = await service.update(tenant, templateId, parsed.data)
    return NextResponse.json({ template })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/document-reports/templates/[templateId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
