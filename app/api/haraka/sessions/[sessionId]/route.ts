import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { SessionsService } from '@/lib/modules/haraka/sessions/sessions.service'

const service = new SessionsService()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    const { sessionId } = await params
    const isRegisterContext = new URL(req.url).searchParams.get('context') === 'register'
    const result = isRegisterContext
      ? await service.getForRegister(tenant, sessionId)
      : await service.getById(tenant, sessionId)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/sessions/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
