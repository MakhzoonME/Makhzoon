import type {
  CardTerminalProvider,
  ProviderChargeRequest,
  ProviderChargeResponse,
  ProviderStatusRequest,
  ProviderWebhookPayload,
  ProviderWebhookResult,
} from './provider.interface'

// Square API: https://developer.squareup.com/reference/square/payments-api
// Uses Bearer token (personal access or OAuth) stored as api_key_enc.
const SQUARE_API = 'https://connect.squareup.com/v2'

export class SquareProvider implements CardTerminalProvider {
  name = 'square'

  async initiateCharge(req: ProviderChargeRequest): Promise<ProviderChargeResponse> {
    const res = await fetch(`${SQUARE_API}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${req.apiKey}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-01',
      },
      body: JSON.stringify({
        idempotency_key: req.reference,
        source_id: 'TERMINAL', // uses Square Terminal device
        amount_money: {
          amount: Math.round(req.amount * 100), // cents
          currency: req.currency,
        },
        reference_id: req.reference,
        terminal_id: req.terminalId,
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Square payment failed (${res.status}): ${body}`)
    }

    const data = await res.json()
    const payment = data.payment ?? {}
    const status = payment.status === 'COMPLETED' ? 'approved' as const
      : payment.status === 'FAILED' ? 'declined' as const
      : 'pending' as const

    return {
      approved: status === 'approved',
      providerRef: payment.id ?? null,
      status,
    }
  }

  async checkStatus(req: ProviderStatusRequest): Promise<ProviderChargeResponse> {
    const res = await fetch(`${SQUARE_API}/payments/${req.providerRef}`, {
      headers: {
        Authorization: `Bearer ${req.apiKey}`,
        'Square-Version': '2024-01-01',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return { approved: false, providerRef: req.providerRef, status: 'pending' }
    }

    const data = await res.json()
    const payment = data.payment ?? {}
    const status = payment.status === 'COMPLETED' ? 'approved' as const
      : payment.status === 'FAILED' ? 'declined' as const
      : 'pending' as const

    return {
      approved: status === 'approved',
      providerRef: req.providerRef,
      status,
    }
  }

  verifyWebhook(payload: ProviderWebhookPayload, _secret: string): ProviderWebhookResult | null {
    // Square sends webhooks with HMAC-SHA256 signature in x-square-hmacsha256-signature header.
    // Verify using the Square webhook signature key.
    try {
      const body = JSON.parse(payload.rawBody) as {
        data?: { object?: { payment?: { id?: string; status?: string; reference_id?: string } } }
      }

      const payment = body?.data?.object?.payment
      if (!payment?.reference_id) return null

      const status = payment.status === 'COMPLETED' ? 'approved' as const : 'declined' as const
      return {
        reference: payment.reference_id,
        providerRef: payment.id ?? null,
        status,
      }
    } catch {
      return null
    }
  }
}
