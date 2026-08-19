import 'server-only'
import { randomUUID } from 'crypto'

/**
 * Infobip WhatsApp API (Business Solution Provider, sits in front of Meta's
 * WABA). The org's own account is Makhzoon's shared Infobip base URL,
 * sender number and API key, stored in platform_notification_config
 * (encrypted at rest).
 *
 * Every message here must reference a pre-approved Utility-category
 * template (order_received / status_update / job_finished /
 * rating_requested) — same Meta template-approval rules apply underneath
 * Infobip; it does not bypass them.
 */

export interface WhatsAppTemplateSend {
  baseUrl: string             // e.g. k95dkx.api.infobip.com (no scheme)
  apiKey: string
  sender: string              // registered WhatsApp sender number
  to: string                  // E.164, e.g. +9627XXXXXXXX
  templateName: string
  languageCode?: string       // default 'en'
  bodyParams: string[]        // positional {{1}}, {{2}}, ... values
}

export interface WhatsAppSendResult {
  ok: boolean
  messageId?: string
  error?: string
}

export async function sendWhatsAppTemplate(input: WhatsAppTemplateSend): Promise<WhatsAppSendResult> {
  const url = `https://${input.baseUrl}/whatsapp/1/message/template`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `App ${input.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        messages: [{
          from: input.sender,
          to: input.to,
          messageId: randomUUID(),
          content: {
            templateName: input.templateName,
            templateData: input.bodyParams.length
              ? { body: { placeholders: input.bodyParams } }
              : undefined,
            language: input.languageCode ?? 'en',
          },
        }],
      }),
    })
    const json = await res.json().catch(() => ({}))
    // Infobip's standard error envelope: { requestError: { serviceException: { text } } }
    if (!res.ok) {
      const errText = json?.requestError?.serviceException?.text
      return { ok: false, error: errText ?? `WhatsApp send failed (${res.status})` }
    }
    const message = json?.messages?.[0]
    if (!message?.messageId) {
      return { ok: false, error: 'WhatsApp send failed: no messageId in response' }
    }
    return { ok: true, messageId: message.messageId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'WhatsApp send failed' }
  }
}
