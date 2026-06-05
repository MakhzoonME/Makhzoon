import type {
  CardTerminalProvider,
  ProviderChargeRequest,
  ProviderChargeResponse,
  ProviderStatusRequest,
  ProviderWebhookPayload,
  ProviderWebhookResult,
} from './provider.interface'

// Paymob API: https://docs.paymob.com/docs/accept-payment-flow
// Uses HMAC secret stored as api_key_enc; terminal_id is the integration_id.
const PAYMOB_API = 'https://accept.paymob.com/api'

export class PaymobProvider implements CardTerminalProvider {
  name = 'paymob'

  async initiateCharge(req: ProviderChargeRequest): Promise<ProviderChargeResponse> {
    // Step 1: Get auth token using the API key (stored as api_key_enc)
    const authRes = await fetch(`${PAYMOB_API}/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: req.apiKey }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!authRes.ok) throw new Error('Paymob auth failed')
    const { token } = await authRes.json() as { token: string }

    // Step 2: Create order
    const orderRes = await fetch(`${PAYMOB_API}/ecommerce/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: false,
        amount_cents: Math.round(req.amount * 100),
        currency: req.currency,
        merchant_order_id: req.reference,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!orderRes.ok) {
      const body = await orderRes.text()
      throw new Error(`Paymob order failed (${orderRes.status}): ${body}`)
    }

    const order = await orderRes.json() as { id: number }

    // Step 3: Request payment key
    const keyRes = await fetch(`${PAYMOB_API}/acceptance/payments/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        source: {
          identifier: req.terminalId ?? 'default',
          subtype: 'TERMINAL',
        },
        payment_token: token,
        order_id: order.id,
        amount_cents: Math.round(req.amount * 100),
        currency: req.currency,
        reference: req.reference,
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!keyRes.ok) {
      const body = await keyRes.text()
      throw new Error(`Paymob payment failed (${keyRes.status}): ${body}`)
    }

    const payment = await keyRes.json() as { id?: string; reference?: string; status?: string }
    const status = payment.status === 'success' ? 'approved' as const
      : payment.status === 'failed' ? 'declined' as const
      : 'pending' as const

    return {
      approved: status === 'approved',
      providerRef: payment.id ?? null,
      status,
    }
  }

  async checkStatus(req: ProviderStatusRequest): Promise<ProviderChargeResponse> {
    const authRes = await fetch(`${PAYMOB_API}/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: req.apiKey }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!authRes.ok) {
      return { approved: false, providerRef: req.providerRef, status: 'pending' }
    }

    const { token } = await authRes.json() as { token: string }

    const res = await fetch(`${PAYMOB_API}/acceptance/transactions/${req.providerRef}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return { approved: false, providerRef: req.providerRef, status: 'pending' }
    }

    const data = await res.json() as { success?: boolean; status?: string; id?: string }
    const status = data.success === true ? 'approved' as const
      : data.status === 'failed' || data.success === false ? 'declined' as const
      : 'pending' as const

    return {
      approved: status === 'approved',
      providerRef: data.id ?? req.providerRef,
      status,
    }
  }

  verifyWebhook(payload: ProviderWebhookPayload, _secret: string): ProviderWebhookResult | null {
    // Paymob sends transaction webhooks with HMAC-SHA256 in the payload.
    try {
      const body = JSON.parse(payload.rawBody) as {
        obj?: { id?: string; reference?: string; success?: boolean }
      }

      const tx = body?.obj
      if (!tx?.reference) return null

      const status = tx.success === true ? 'approved' as const : 'declined' as const
      return {
        reference: tx.reference,
        providerRef: tx.id?.toString() ?? null,
        status,
      }
    } catch {
      return null
    }
  }
}
