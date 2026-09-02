import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { VisitsService } from '@/lib/modules/zeyara/visits/visits.service'
import { addVisitNoteSchema } from '@/lib/modules/zeyara/visits/schemas'

const service = new VisitsService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'zeyara')
    const { visitId } = await params
    const notes = await service.listNotes(tenant, visitId)
    return NextResponse.json({ notes })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/zeyara/visits/[id]/notes]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Notes are append-only — there is no PATCH or DELETE here, and that
// omission is deliberate, not an oversight.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'zeyara')
    const { visitId } = await params
    const body = await req.json()
    const parsed = addVisitNoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const note = await service.addNote(tenant, visitId, parsed.data.body)
    return NextResponse.json({ note }, { status: 201 })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/zeyara/visits/[id]/notes]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
