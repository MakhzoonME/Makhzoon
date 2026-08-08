import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { encrypt, decrypt } from '@/lib/platform/crypto/secret-cipher'
import type { TenantContext } from '@/lib/platform/tenancy/types'

export interface ServiceNotificationConfig {
  organizationId: string
  whatsappEnabled: boolean
  whatsappPhoneNumberId: string | null
  /** whatsapp_token_enc is never returned to the client — only this flag. */
  whatsappTokenSet: boolean
  whatsappWebhookSecretSet: boolean
  ocrProvider: string
  /** ocr_api_key_enc is never returned to the client — only this flag. */
  ocrApiKeySet: boolean
}

interface ResolvedSecrets {
  whatsappToken: string | null
  ocrApiKey: string | null
  webhookSecret: string | null
}

type Row = Record<string, unknown>

function toConfig(r: Row): ServiceNotificationConfig {
  return {
    organizationId:            r.organization_id as string,
    whatsappEnabled:           (r.whatsapp_enabled as boolean) ?? false,
    whatsappPhoneNumberId:     (r.whatsapp_phone_number_id as string) ?? null,
    whatsappTokenSet:          !!r.whatsapp_token_enc,
    whatsappWebhookSecretSet:  !!r.whatsapp_webhook_secret,
    ocrProvider:               (r.ocr_provider as string) ?? 'fastplateocr',
    ocrApiKeySet:              !!r.ocr_api_key_enc,
  }
}

export class ServiceNotificationConfigRepository {
  /** Public shape only — never includes decrypted secrets, only *Set flags. */
  async get(tenant: TenantContext): Promise<ServiceNotificationConfig | null> {
    const { data } = await supabaseAdmin
      .from('haraka_service_notification_config')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()
    return data ? toConfig(data as Row) : null
  }

  /** Server-only: fetches and decrypts secrets. Never expose the return value to a client response. */
  async getWithSecrets(
    organizationId: string,
  ): Promise<(ServiceNotificationConfig & ResolvedSecrets) | null> {
    const { data } = await supabaseAdmin
      .from('haraka_service_notification_config')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle()
    if (!data) return null
    const r = data as Row
    return {
      ...toConfig(r),
      whatsappToken: decrypt(r.whatsapp_token_enc as string | null),
      ocrApiKey:     decrypt(r.ocr_api_key_enc as string | null),
      webhookSecret: (r.whatsapp_webhook_secret as string | null) ?? null,
    }
  }

  async upsert(
    tenant: TenantContext,
    patch: Partial<{
      whatsappEnabled: boolean
      whatsappPhoneNumberId: string | null
      whatsappToken: string | null
      whatsappWebhookSecret: string | null
      ocrProvider: string
      ocrApiKey: string | null
    }>,
  ): Promise<ServiceNotificationConfig> {
    const row: Row = { organization_id: tenant.organizationId, updated_by: tenant.userId }
    if (patch.whatsappEnabled        !== undefined) row.whatsapp_enabled = patch.whatsappEnabled
    if (patch.whatsappPhoneNumberId  !== undefined) row.whatsapp_phone_number_id = patch.whatsappPhoneNumberId
    if (patch.whatsappToken          !== undefined) row.whatsapp_token_enc = patch.whatsappToken ? encrypt(patch.whatsappToken) : null
    if (patch.whatsappWebhookSecret  !== undefined) row.whatsapp_webhook_secret = patch.whatsappWebhookSecret
    if (patch.ocrProvider            !== undefined) row.ocr_provider = patch.ocrProvider
    if (patch.ocrApiKey              !== undefined) row.ocr_api_key_enc = patch.ocrApiKey ? encrypt(patch.ocrApiKey) : null

    const { data, error } = await supabaseAdmin
      .from('haraka_service_notification_config')
      .upsert(row, { onConflict: 'organization_id' })
      .select('*')
      .single()
    if (error) throw error
    return toConfig(data as Row)
  }
}
