export interface ProviderChargeRequest {
  reference: string
  amount: number
  currency: string
  terminalId: string | null
  apiKey: string
}

export interface ProviderChargeResponse {
  approved: boolean
  providerRef: string | null
  status: 'approved' | 'declined' | 'pending'
  message?: string
}

export interface ProviderStatusRequest {
  providerRef: string
  apiKey: string
}

export interface ProviderWebhookPayload {
  rawBody: string
  signature: string
  provider: string
}

export interface ProviderWebhookResult {
  reference: string
  providerRef: string | null
  status: 'approved' | 'declined'
}

export interface CardTerminalProvider {
  name: string
  initiateCharge(req: ProviderChargeRequest): Promise<ProviderChargeResponse>
  checkStatus(req: ProviderStatusRequest): Promise<ProviderChargeResponse>
  verifyWebhook(payload: ProviderWebhookPayload, secret: string): ProviderWebhookResult | null
}
