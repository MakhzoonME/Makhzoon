import 'server-only'

/**
 * Direct Meta WhatsApp Cloud API integration — no BSP. The org's own
 * WhatsApp Business number, phone-number-id and permanent system-user token
 * live in haraka_service_notification_config (encrypted at rest).
 *
 * Every message here must reference a pre-approved Utility-category
 * template (order_received / status_update / job_finished /
 * rating_requested) — Meta rejects free-form text outside a customer-
 * initiated 24h window.
 */

const GRAPH_API_VERSION = 'v22.0'

export interface WhatsAppTemplateSend {
  phoneNumberId: string
  accessToken: string
  to: string                 // E.164, e.g. +9627XXXXXXXX
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
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${input.phoneNumberId}/messages`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: input.to,
        type: 'template',
        template: {
          name: input.templateName,
          language: { code: input.languageCode ?? 'en' },
          components: input.bodyParams.length
            ? [{ type: 'body', parameters: input.bodyParams.map((text) => ({ type: 'text', text })) }]
            : undefined,
        },
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, error: json?.error?.message ?? `WhatsApp send failed (${res.status})` }
    }
    return { ok: true, messageId: json?.messages?.[0]?.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'WhatsApp send failed' }
  }
}
