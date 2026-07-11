import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { CardTerminalService } from '@/lib/modules/haraka/card-terminal/card-terminal.service'
import { z } from 'zod'

const testSchema = z.object({ bridgeUrl: z.string().url().max(500) })

const service = new CardTerminalService()

export async function POST(req: NextRequest) {
  try {
    requireFeature(await resolveTenant(), 'pos')
    const parsed = testSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: 'bridgeUrl is required' }, { status: 422 })
    }
    const { bridgeUrl } = parsed.data
    const reachable = await service.testBridge(bridgeUrl)
    return NextResponse.json({ reachable })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[POST /api/haraka/card-terminal-config/test]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
