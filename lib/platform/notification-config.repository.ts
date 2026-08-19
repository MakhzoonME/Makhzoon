import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { encrypt, decrypt } from '@/lib/platform/crypto/secret-cipher'

/**
 * WhatsApp/OCR credentials are Makhzoon's own accounts (one shared Infobip
 * WhatsApp sender, one shared Plate Recognizer account) used across every
 * organization — not something each org configures. Single global row,
 * editable only by superadmins (app/api/superadmin/notification-config).
 */

export interface PlatformNotificationConfig {
  whatsappEnabled: boolean
  infobipBaseUrl: string | null
  infobipSender: string | null
  infobipApiKeySet: boolean
  infobipWebhookSecretSet: boolean
  ocrProvider: string
  ocrApiKeySet: boolean
}

interface ResolvedSecrets {
  infobipApiKey: string | null
  ocrApiKey: string | null
  infobipWebhookSecret: string | null
}

type Row = Record<string, unknown>

function toConfig(r: Row): PlatformNotificationConfig {
  return {
    whatsappEnabled:          (r.whatsapp_enabled as boolean) ?? false,
    infobipBaseUrl:           (r.infobip_base_url as string) ?? null,
    infobipSender:            (r.infobip_sender as string) ?? null,
    infobipApiKeySet:         !!r.infobip_api_key_enc,
    infobipWebhookSecretSet:  !!r.infobip_webhook_secret,
    ocrProvider:              (r.ocr_provider as string) ?? 'platerecognizer',
    ocrApiKeySet:             !!r.ocr_api_key_enc,
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
      infobipApiKey:        decrypt(r.infobip_api_key_enc as string | null),
      ocrApiKey:            decrypt(r.ocr_api_key_enc as string | null),
      infobipWebhookSecret: (r.infobip_webhook_secret as string | null) ?? null,
    }
  }

  async upsert(
    updatedBy: string,
    patch: Partial<{
      whatsappEnabled: boolean
      infobipBaseUrl: string | null
      infobipSender: string | null
      infobipApiKey: string | null
      infobipWebhookSecret: string | null
      ocrProvider: string
      ocrApiKey: string | null
    }>,
  ): Promise<PlatformNotificationConfig> {
    const row: Row = { id: true, updated_by: updatedBy }
    if (patch.whatsappEnabled       !== undefined) row.whatsapp_enabled = patch.whatsappEnabled
    if (patch.infobipBaseUrl        !== undefined) row.infobip_base_url = patch.infobipBaseUrl
    if (patch.infobipSender         !== undefined) row.infobip_sender = patch.infobipSender
    if (patch.infobipApiKey         !== undefined) row.infobip_api_key_enc = patch.infobipApiKey ? encrypt(patch.infobipApiKey) : null
    if (patch.infobipWebhookSecret  !== undefined) row.infobip_webhook_secret = patch.infobipWebhookSecret
    if (patch.ocrProvider           !== undefined) row.ocr_provider = patch.ocrProvider
    if (patch.ocrApiKey             !== undefined) row.ocr_api_key_enc = patch.ocrApiKey ? encrypt(patch.ocrApiKey) : null

    const { data, error } = await supabaseAdmin
      .from('platform_notification_config')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single()
    if (error) throw error
    return toConfig(data as Row)
  }
}
