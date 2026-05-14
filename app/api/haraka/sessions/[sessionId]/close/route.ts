import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { SessionsService } from '@/lib/modules/haraka/sessions/sessions.service'
import { closeSessionSchema } from '@/lib/modules/haraka/sessions/schemas'

const service = new SessionsService()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { sessionId } = await params
    const body = await req.json()
    const parsed = closeSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const result = await service.close(tenant, sessionId, {
      closingFloat: parsed.data.closingFloat,
      notes: parsed.data.notes ?? null,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[POST /api/haraka/sessions/[id]/close]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
