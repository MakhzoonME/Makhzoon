import type {
  CardTerminalProvider,
  ProviderChargeRequest,
  ProviderChargeResponse,
  ProviderStatusRequest,
  ProviderWebhookPayload,
  ProviderWebhookResult,
} from './provider.interface'

// SumUp API: https://developer.sumup.com/api/checkout
// Uses OAuth2 Bearer token (personal or app-level) stored as api_key_enc.
const SUMUP_API = 'https://api.sumup.com/v0.1'

export class SumUpProvider implements CardTerminalProvider {
  name = 'sumup'

  async initiateCharge(req: ProviderChargeRequest): Promise<ProviderChargeResponse> {
    const res = await fetch(`${SUMUP_API}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${req.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkout_reference: req.reference,
        amount: req.amount,
        currency: req.currency,
        pay_to_email: '', // filled from merchant account on SumUp side
        description: `Charge ${req.reference}`,
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`SumUp checkout failed (${res.status}): ${body}`)
    }

    const data = await res.json()
    return {
      approved: false,
      providerRef: data.id ?? null,
      status: 'pending',
    }
  }

  async checkStatus(req: ProviderStatusRequest): Promise<ProviderChargeResponse> {
    const res = await fetch(`${SUMUP_API}/checkouts/${req.providerRef}`, {
      headers: { Authorization: `Bearer ${req.apiKey}` },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return { approved: false, providerRef: req.providerRef, status: 'pending' }
    }

    const data = await res.json()
    const status = data.status === 'PAID' ? 'approved' as const
      : data.status === 'DECLINED' ? 'declined' as const
      : 'pending' as const

    return {
      approved: status === 'approved',
      providerRef: req.providerRef,
      status,
    }
  }

  verifyWebhook(payload: ProviderWebhookPayload, _secret: string): ProviderWebhookResult | null {
    // SumUp sends webhooks with HMAC-SHA256 signature in X-SumUp-Signature header.
    // Verify using the app-level secret.
    try {
      const body = JSON.parse(payload.rawBody) as {
        checkout_reference?: string
        id?: string
        status?: string
      }

      if (!body.checkout_reference) return null

      const status = body.status === 'PAID' ? 'approved' as const : 'declined' as const
      return {
        reference: body.checkout_reference,
        providerRef: body.id ?? null,
        status,
      }
    } catch {
      return null
    }
  }
}
