import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { VisitsService } from '@/lib/modules/zeyara/visits/visits.service'

const service = new VisitsService()

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ visitId: string; attachmentId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'zeyara')
    const { visitId, attachmentId } = await params
    await service.deleteAttachment(tenant, visitId, attachmentId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[DELETE /api/zeyara/visits/[id]/attachments/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
