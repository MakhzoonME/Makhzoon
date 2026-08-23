import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { encrypt, decrypt } from '@/lib/platform/crypto/secret-cipher'

/**
 * WhatsApp/OCR credentials are Makhzoon's own accounts (one shared WhatsApp
 * Business number, one shared Plate Recognizer account) used across every
 * organization — not something each org configures. Single global row,
 * editable only by superadmins (app/api/superadmin/notification-config).
 */

export interface PlatformNotificationConfig {
  whatsappEnabled: boolean
  whatsappPhoneNumberId: string | null
  whatsappTokenSet: boolean
  whatsappWebhookSecretSet: boolean
  ocrProvider: string
  ocrApiKeySet: boolean
}

interface ResolvedSecrets {
  whatsappToken: string | null
  ocrApiKey: string | null
  webhookSecret: string | null
}

type Row = Record<string, unknown>

function toConfig(r: Row): PlatformNotificationConfig {
  return {
    whatsappEnabled:           (r.whatsapp_enabled as boolean) ?? false,
    whatsappPhoneNumberId:     (r.whatsapp_phone_number_id as string) ?? null,
    whatsappTokenSet:          !!r.whatsapp_token_enc,
    whatsappWebhookSecretSet:  !!r.whatsapp_webhook_secret,
    ocrProvider:               (r.ocr_provider as string) ?? 'platerecognizer',
    ocrApiKeySet:              !!r.ocr_api_key_enc,
  }
}

export class PlatformNotificationConfigRepository {
  /** Public shape only — never includes decrypted secrets, only *Set flags. */
  async get(): Promise<PlatformNotificationConfig | null> {
    const { data } = await supabaseAdmin
      .from('platform_notification_config')
      .select('*')
      .eq('id', true)
      .maybeSingle()
    return data ? toConfig(data as Row) : null
  }

  /** Server-only: fetches and decrypts secrets. Never expose the return value to a client response. */
  async getWithSecrets(): Promise<(PlatformNotificationConfig & ResolvedSecrets) | null> {
    const { data } = await supabaseAdmin
      .from('platform_notification_config')
      .select('*')
      .eq('id', true)
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
    updatedBy: string,
    patch: Partial<{
      whatsappEnabled: boolean
      whatsappPhoneNumberId: string | null
      whatsappToken: string | null
      whatsappWebhookSecret: string | null
      ocrProvider: string
      ocrApiKey: string | null
    }>,
  ): Promise<PlatformNotificationConfig> {
    const row: Row = { id: true, updated_by: updatedBy }
    if (patch.whatsappEnabled        !== undefined) row.whatsapp_enabled = patch.whatsappEnabled
    if (patch.whatsappPhoneNumberId  !== undefined) row.whatsapp_phone_number_id = patch.whatsappPhoneNumberId
    if (patch.whatsappToken          !== undefined) row.whatsapp_token_enc = patch.whatsappToken ? encrypt(patch.whatsappToken) : null
    if (patch.whatsappWebhookSecret  !== undefined) row.whatsapp_webhook_secret = patch.whatsappWebhookSecret
    if (patch.ocrProvider            !== undefined) row.ocr_provider = patch.ocrProvider
    if (patch.ocrApiKey              !== undefined) row.ocr_api_key_enc = patch.ocrApiKey ? encrypt(patch.ocrApiKey) : null

    const { data, error } = await supabaseAdmin
      .from('platform_notification_config')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single()
    if (error) throw error
    return toConfig(data as Row)
  }
}
