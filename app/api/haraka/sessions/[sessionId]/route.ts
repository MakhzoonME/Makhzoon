import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { SessionsService } from '@/lib/modules/haraka/sessions/sessions.service'

const service = new SessionsService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { sessionId } = await params
    const result = await service.getById(tenant, sessionId)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/sessions/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
