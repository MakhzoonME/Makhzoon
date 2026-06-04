import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { rateLimitTenant } from '@/lib/rate-limit'
import { CardTerminalService } from '@/lib/modules/haraka/card-terminal/card-terminal.service'
import { cardTerminalConfigSchema } from '@/lib/modules/haraka/card-terminal/schemas'

const service = new CardTerminalService()

export async function GET() {
  try {
    const tenant = await resolveTenant()
    const config = await service.getConfig(tenant)
    return NextResponse.json({ config })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/card-terminal-config]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const tenant = await resolveTenant()
    const body = await req.json()
    const parsed = cardTerminalConfigSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const { apiKey, webhookSecret, ...rest } = parsed.data
    const config = await service.updateConfig(tenant, {
      ...rest,
      apiKey:        apiKey,
      webhookSecret: webhookSecret,
    })
    return NextResponse.json({ config })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[PATCH /api/haraka/card-terminal-config]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
