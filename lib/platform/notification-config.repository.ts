import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { encrypt, decrypt } from '@/lib/platform/crypto/secret-cipher'

/**
 * OCR credentials are Makhzoon's own account (one shared Plate Recognizer
 * account) used across every organization — not something each org
 * configures. Single global row, editable only by superadmins
 * (app/api/superadmin/notification-config).
 *
 * WhatsApp messaging was removed for now (was Meta Cloud API, briefly
 * Infobip) — see git history if it needs to come back.
 */

export interface PlatformNotificationConfig {
  ocrProvider: string
  ocrApiKeySet: boolean
}

interface ResolvedSecrets {
  ocrApiKey: string | null
}

type Row = Record<string, unknown>

function toConfig(r: Row): PlatformNotificationConfig {
  return {
    ocrProvider:  (r.ocr_provider as string) ?? 'platerecognizer',
    ocrApiKeySet: !!r.ocr_api_key_enc,
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
      ocrApiKey: decrypt(r.ocr_api_key_enc as string | null),
    }
  }

  async upsert(
    updatedBy: string,
    patch: Partial<{
      ocrProvider: string
      ocrApiKey: string | null
    }>,
  ): Promise<PlatformNotificationConfig> {
    const row: Row = { id: true, updated_by: updatedBy }
    if (patch.ocrProvider !== undefined) row.ocr_provider = patch.ocrProvider
    if (patch.ocrApiKey   !== undefined) row.ocr_api_key_enc = patch.ocrApiKey ? encrypt(patch.ocrApiKey) : null

    const { data, error } = await supabaseAdmin
      .from('platform_notification_config')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single()
    if (error) throw error
    return toConfig(data as Row)
  }
}
