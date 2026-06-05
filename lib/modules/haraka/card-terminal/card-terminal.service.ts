import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import type { HarakaCardTerminalConfig, HarakaCardCharge, CardChargeStatus } from '@/types'
import { CardTerminalRepository, type ConfigPatchInput } from './card-terminal.repository'
import { getProvider } from './providers/registry'

const repo = new CardTerminalRepository()

function requireCashier(tenant: TenantContext) {
  if (!hasPermission(tenant, 'pos', 'open_session')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireAdmin(tenant: TenantContext) {
  if (!hasPermission(tenant, 'settings', 'fawtara')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export class CardTerminalService {
  async getConfig(tenant: TenantContext): Promise<HarakaCardTerminalConfig> {
    requireCashier(tenant)
    return repo.getConfig(tenant)
  }

  async updateConfig(tenant: TenantContext, patch: ConfigPatchInput): Promise<HarakaCardTerminalConfig> {
    requireAdmin(tenant)
    const config = await repo.upsertConfig(tenant, patch)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'CARD_TERMINAL_CONFIG_UPDATED',
      recordId: tenant.organizationId,
      newValue: { mode: config.mode, enabled: config.enabled },
    })
    return config
  }

  /**
   * Initiate a charge. For display/webhook modes: just create a pending DB row.
   * For local_bridge: forward the charge to the bridge URL.
   * For cloud: call the provider's API via the registered provider implementation.
   */
  async initiateCharge(
    tenant: TenantContext,
    input: { reference: string; amount: number; currency: string },
  ): Promise<HarakaCardCharge> {
    requireCashier(tenant)
    const config = await repo.getConfig(tenant)

    if (!config.enabled) {
      throw NextResponse.json({ error: 'Card terminal is not enabled' }, { status: 400 })
    }

    // Create the pending charge row first — it's the source of truth for polling
    let charge = await repo.createCharge(tenant, input)

    if (config.mode === 'local_bridge' && config.bridgeUrl) {
      // Fire-and-forget to the local bridge; it will update status via webhook or
      // the POS will poll the DB row. Bridge failure doesn't fail the cashier.
      this._sendToBridge(config.bridgeUrl, charge).catch((err) =>
        console.error('[card-terminal] bridge error', err),
      )
    }

    if (config.mode === 'cloud' && config.provider) {
      const apiKey = await repo.getApiKey(tenant.organizationId)
      if (!apiKey) {
        throw NextResponse.json({ error: 'Cloud provider API key not configured' }, { status: 400 })
      }

      const provider = getProvider(config.provider)
      if (!provider) {
        throw NextResponse.json({ error: `Unknown provider: ${config.provider}` }, { status: 400 })
      }

      // Call the provider API to initiate the charge
      const result = await provider.initiateCharge({
        reference: charge.reference,
        amount: charge.amount,
        currency: charge.currency,
        terminalId: config.terminalId,
        apiKey,
      })

      // Update the charge row with the provider result
      charge = await repo.updateChargeStatus(
        tenant,
        charge.reference,
        result.status,
        result.providerRef,
      )
    }

    return charge
  }

  async getChargeStatus(tenant: TenantContext, ref: string): Promise<HarakaCardCharge> {
    requireCashier(tenant)
    const charge = await repo.getChargeByRef(tenant, ref)
    if (!charge) throw NextResponse.json({ error: 'Charge not found' }, { status: 404 })

    // For cloud mode, poll the provider for status updates
    if (charge.status === 'pending' && charge.providerRef) {
      const config = await repo.getConfig(tenant)
      if (config.mode === 'cloud' && config.provider) {
        const apiKey = await repo.getApiKey(tenant.organizationId)
        if (apiKey) {
          const provider = getProvider(config.provider)
          if (provider) {
            const result = await provider.checkStatus({
              providerRef: charge.providerRef,
              apiKey,
            })
            if (result.status !== 'pending') {
              return repo.updateChargeStatus(tenant, ref, result.status, result.providerRef)
            }
          }
        }
      }
    }

    return charge
  }

  async updateChargeStatus(
    tenant: TenantContext,
    ref: string,
    status: CardChargeStatus,
    providerRef?: string | null,
  ): Promise<HarakaCardCharge> {
    requireCashier(tenant)
    return repo.updateChargeStatus(tenant, ref, status, providerRef)
  }

  /**
   * Verify the HMAC-SHA256 signature on an inbound webhook and update the charge.
   * Used by the /api/haraka/card-payment-result endpoint.
   */
  async receiveWebhook(
    orgId: string,
    ref: string,
    status: CardChargeStatus,
    providerRef: string | null,
    signature: string,
    rawBody: string,
  ): Promise<void> {
    const secret = await repo.getWebhookSecret(orgId)
    if (!secret) throw new Error('No webhook secret configured')
    const valid = await this._verifyHmac(secret, rawBody, signature)
    if (!valid) throw new Error('Invalid webhook signature')
    await repo.updateChargeStatus({ organizationId: orgId } as TenantContext, ref, status, providerRef)
  }

  /** Test the local bridge connection — returns true if reachable. */
  async testBridge(bridgeUrl: string): Promise<boolean> {
    try {
      const res = await fetch(`${bridgeUrl}/health`, { signal: AbortSignal.timeout(5000) })
      return res.ok
    } catch {
      return false
    }
  }

  private async _sendToBridge(
    bridgeUrl: string,
    charge: HarakaCardCharge,
  ): Promise<void> {
    await fetch(`${bridgeUrl}/charge`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        reference: charge.reference,
        amount:    charge.amount,
        currency:  charge.currency,
      }),
      signal: AbortSignal.timeout(10_000),
    })
  }

  private async _verifyHmac(secret: string, body: string, signature: string): Promise<boolean> {
    const enc  = new TextEncoder()
    const key  = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    )
    const sig  = await crypto.subtle.sign('HMAC', key, enc.encode(body))
    const hex  = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
    // Constant-time compare
    if (hex.length !== signature.length) return false
    let diff = 0
    for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i)
    return diff === 0
  }
}
