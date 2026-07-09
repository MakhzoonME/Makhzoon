import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { CardTerminalService } from '@/lib/modules/haraka/card-terminal/card-terminal.service'

const service = new CardTerminalService()

export async function POST(req: NextRequest) {
  try {
    await resolveTenant()
    const body = await req.json().catch(() => ({}))
    const bridgeUrl = typeof body.bridgeUrl === 'string' ? body.bridgeUrl : null
    if (!bridgeUrl) {
      return NextResponse.json({ error: 'bridgeUrl is required' }, { status: 422 })
    }
    const reachable = await service.testBridge(bridgeUrl)
    return NextResponse.json({ reachable })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/card-terminal-config/test]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
