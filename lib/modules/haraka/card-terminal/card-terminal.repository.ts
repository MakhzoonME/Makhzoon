import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type {
  HarakaCardTerminalConfig,
  HarakaCardCharge,
  CardTerminalMode,
  CardTerminalProvider,
  CardChargeStatus,
} from '@/types'

type Row = Record<string, unknown>

const DEFAULTS: Omit<HarakaCardTerminalConfig, 'organizationId'> = {
  enabled:          false,
  mode:             'display',
  bridgeUrl:        null,
  provider:         null,
  apiKeySet:        false,
  terminalId:       null,
  webhookSecretSet: false,
  currency:         'JOD',
  timeoutSeconds:   60,
}

function toConfig(r: Row): HarakaCardTerminalConfig {
  return {
    organizationId:  r.organization_id as string,
    enabled:         (r.enabled as boolean) ?? false,
    mode:            (r.mode as CardTerminalMode) ?? 'display',
    bridgeUrl:       (r.bridge_url as string) ?? null,
    provider:        (r.provider as CardTerminalProvider) ?? null,
    apiKeySet:       !!(r.api_key_enc),   // never expose the key itself
    terminalId:      (r.terminal_id as string) ?? null,
    webhookSecretSet:!!(r.webhook_secret),
    currency:        (r.currency as string) ?? 'JOD',
    timeoutSeconds:  Number(r.timeout_seconds ?? 60),
  }
}

function toCharge(r: Row): HarakaCardCharge {
  return {
    id:             r.id as string,
    organizationId: r.organization_id as string,
    reference:      r.reference as string,
    amount:         Number(r.amount ?? 0),
    currency:       (r.currency as string) ?? 'JOD',
    status:         (r.status as CardChargeStatus) ?? 'pending',
    providerRef:    (r.provider_ref as string) ?? null,
    createdAt:      r.created_at ? new Date(r.created_at as string) : new Date(),
    updatedAt:      r.updated_at ? new Date(r.updated_at as string) : new Date(),
  }
}

export interface ConfigPatchInput {
  enabled?: boolean
  mode?: CardTerminalMode
  bridgeUrl?: string | null
  provider?: CardTerminalProvider | null
  apiKey?: string | null
  terminalId?: string | null
  webhookSecret?: string | null
  currency?: string
  timeoutSeconds?: number
}

export class CardTerminalRepository {
  async getConfig(tenant: TenantContext): Promise<HarakaCardTerminalConfig> {
    const { data } = await supabaseAdmin
      .from('haraka_card_terminal_config')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()
    if (!data) return { organizationId: tenant.organizationId, ...DEFAULTS }
    return toConfig(data)
  }

  async upsertConfig(tenant: TenantContext, patch: ConfigPatchInput): Promise<HarakaCardTerminalConfig> {
    const update: Row = { organization_id: tenant.organizationId, updated_by: tenant.userId }
    if (patch.enabled        !== undefined) update.enabled         = patch.enabled
    if (patch.mode           !== undefined) update.mode            = patch.mode
    if (patch.bridgeUrl      !== undefined) update.bridge_url      = patch.bridgeUrl
    if (patch.provider       !== undefined) update.provider        = patch.provider
    if (patch.apiKey         !== undefined) update.api_key_enc     = patch.apiKey   // plaintext for now; encrypt server-side in prod
    if (patch.terminalId     !== undefined) update.terminal_id     = patch.terminalId
    if (patch.webhookSecret  !== undefined) update.webhook_secret  = patch.webhookSecret
    if (patch.currency       !== undefined) update.currency        = patch.currency
    if (patch.timeoutSeconds !== undefined) update.timeout_seconds = patch.timeoutSeconds

    const { data, error } = await supabaseAdmin
      .from('haraka_card_terminal_config')
      .upsert(update, { onConflict: 'organization_id' })
      .select('*')
      .single()
    if (error) throw error
    return toConfig(data)
  }

  async createCharge(
    tenant: TenantContext,
    input: { reference: string; amount: number; currency: string },
  ): Promise<HarakaCardCharge> {
    const { data, error } = await supabaseAdmin
      .from('haraka_card_charges')
      .insert({
        organization_id: tenant.organizationId,
        reference:       input.reference,
        amount:          input.amount,
        currency:        input.currency,
        status:          'pending',
      })
      .select('*')
      .single()
    if (error) throw error
    return toCharge(data)
  }

  async getChargeByRef(tenant: TenantContext, ref: string): Promise<HarakaCardCharge | null> {
    const { data } = await supabaseAdmin
      .from('haraka_card_charges')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .eq('reference', ref)
      .maybeSingle()
    return data ? toCharge(data) : null
  }

  async updateChargeStatus(
    tenant: TenantContext,
    ref: string,
    status: CardChargeStatus,
    providerRef?: string | null,
  ): Promise<HarakaCardCharge> {
    const patch: Row = { status }
    if (providerRef !== undefined) patch.provider_ref = providerRef
    const { data, error } = await supabaseAdmin
      .from('haraka_card_charges')
      .update(patch)
      .eq('organization_id', tenant.organizationId)
      .eq('reference', ref)
      .select('*')
      .single()
    if (error) throw error
    return toCharge(data)
  }

  /** Fetch webhook secret (server-side only — never sent to client). */
  async getWebhookSecret(orgId: string): Promise<string | null> {
    const { data } = await supabaseAdmin
      .from('haraka_card_terminal_config')
      .select('webhook_secret')
      .eq('organization_id', orgId)
      .maybeSingle()
    return (data?.webhook_secret as string) ?? null
  }
}
