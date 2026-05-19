import type { FawtaraInvoicePayload } from './mapper'

/**
 * Typed HTTP client targeting Fawtara's submission endpoint. Endpoint URLs and
 * auth header format are placeholders — replaced once we have credentials.
 *
 * Sandbox vs production is decided by `mode`; in both cases auth is a Bearer
 * token derived from the configured clientId/clientSecret (server-side only,
 * never exposed to the browser).
 */

export interface FawtaraClientOpts {
  mode: 'sandbox' | 'production'
  clientId: string
  clientSecret: string
  /** Optional override for tests / mock servers. */
  baseUrlOverride?: string
}

export interface FawtaraSubmitResponse {
  uuid: string
  qrPayload: string
  acceptedAt: string
}

export interface FawtaraSubmitError {
  code: string
  message: string
  details?: unknown
}

const BASE_URLS = {
  sandbox: 'https://sandbox.fawtara.gov.jo/api/v1',
  production: 'https://fawtara.gov.jo/api/v1',
}

export class FawtaraClient {
  constructor(private readonly opts: FawtaraClientOpts) {}

  private get baseUrl(): string {
    return this.opts.baseUrlOverride ?? BASE_URLS[this.opts.mode]
  }

  /**
   * Submit an invoice. Returns the UUID and QR payload Fawtara assigned, or
   * throws on transport / auth / validation errors.
   *
   * Retries are caller-owned (see service.ts `retry-queue`).
   */
  async submitInvoice(payload: FawtaraInvoicePayload, signal?: AbortSignal): Promise<FawtaraSubmitResponse> {
    const res = await fetch(`${this.baseUrl}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await this.exchangeForToken()}`,
      },
      body: JSON.stringify(payload),
      signal,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const err: FawtaraSubmitError = {
        code: body.code ?? `HTTP_${res.status}`,
        message: body.message ?? res.statusText,
        details: body,
      }
      throw err
    }
    const data = await res.json()
    return {
      uuid: data.uuid,
      qrPayload: data.qrPayload ?? data.qr ?? '',
      acceptedAt: data.acceptedAt ?? new Date().toISOString(),
    }
  }

  /**
   * OAuth-style token exchange. In v1 the contract is undocumented; this
   * is a placeholder that will be replaced once we have the spec. We expose
   * it as a method so unit tests can mock it.
   */
  private async exchangeForToken(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.opts.clientId,
        client_secret: this.opts.clientSecret,
      }).toString(),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw { code: 'AUTH_FAILED', message: body.error_description ?? res.statusText } as FawtaraSubmitError
    }
    const data = await res.json()
    return data.access_token as string
  }
}
