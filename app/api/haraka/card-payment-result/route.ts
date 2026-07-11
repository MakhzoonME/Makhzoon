import { NextRequest, NextResponse } from 'next/server'
import { CardTerminalService } from '@/lib/modules/haraka/card-terminal/card-terminal.service'
import type { CardChargeStatus } from '@/types'

const service = new CardTerminalService()

/**
 * Inbound webhook from a card terminal cloud provider.
 * Verifies the HMAC-SHA256 signature before updating the charge status.
 * The org is identified by the `x-org-id` header sent by the provider.
 */
export async function POST(req: NextRequest) {
  try {
    const orgId     = req.headers.get('x-org-id') ?? ''
    const signature = req.headers.get('x-signature') ?? ''
    if (!orgId) return NextResponse.json({ error: 'x-org-id header required' }, { status: 400 })

    const rawBody = await req.text()
    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const ref    = typeof body.reference === 'string' ? body.reference : null
    const status = typeof body.status    === 'string' ? body.status    : null
    const providerRef = typeof body.providerRef === 'string' ? body.providerRef : null

    if (!ref || !status) {
      return NextResponse.json({ error: 'reference and status are required' }, { status: 422 })
    }
    const validStatuses: CardChargeStatus[] = ['approved', 'declined', 'timeout', 'cancelled']
    if (!validStatuses.includes(status as CardChargeStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 422 })
    }

    await service.receiveWebhook(orgId, ref, status as CardChargeStatus, providerRef, signature, rawBody)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && err.message.includes('signature')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[POST /api/haraka/card-payment-result]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
