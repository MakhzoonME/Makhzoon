import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { VisitsService } from '@/lib/modules/zeyara/visits/visits.service'
import { visitAttachmentSchema } from '@/lib/modules/zeyara/visits/schemas'

const service = new VisitsService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'zeyara')
    const { visitId } = await params
    const attachments = await service.listAttachments(tenant, visitId)
    return NextResponse.json({ attachments })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/zeyara/visits/[id]/attachments]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'zeyara')
    const { visitId } = await params

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file supplied' }, { status: 400 })
    }
    // Validate name/type/size before a single byte reaches storage.
    const parsed = visitAttachmentSchema.safeParse({
      name: file.name,
      type: file.type,
      size: file.size,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const attachment = await service.addAttachment(tenant, visitId, file)
    return NextResponse.json({ attachment }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/zeyara/visits/[id]/attachments]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
