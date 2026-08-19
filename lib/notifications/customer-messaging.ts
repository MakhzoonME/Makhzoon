import 'server-only'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { PlatformNotificationConfigRepository } from '@/lib/platform/notification-config.repository'
import { sendWhatsAppTemplate } from './channels/whatsapp'

/**
 * Customer-facing messaging (WhatsApp only), separate from the in-app/email
 * notificationQueue in this directory. Deliberately separate: notificationQueue
 * resolves recipients as *org users* by role (notification_org_defaults /
 * notification_preferences); this queue's only recipient is the external
 * customer phone number attached to the job, so it doesn't fit that
 * recipient-resolution model. Same fire-and-forget shape as
 * queueAuditLog/notificationQueue.enqueue — never awaited by callers, never
 * throws.
 */

export type CustomerMessageTemplate =
  | 'order_received'
  | 'status_update'
  | 'job_finished'
  | 'rating_requested'

const configRepo = new PlatformNotificationConfigRepository()

interface SendInput {
  tenant: TenantContext
  jobId: string
  customerPhone: string | null
  template: CustomerMessageTemplate
  variables: Record<string, string>
}

async function deliver(input: SendInput): Promise<void> {
  if (!input.customerPhone) return
  const cfg = await configRepo.getWithSecrets()
  if (!cfg?.whatsappEnabled || !cfg.infobipBaseUrl || !cfg.infobipSender || !cfg.infobipApiKey) return

  const result = await sendWhatsAppTemplate({
    baseUrl:      cfg.infobipBaseUrl,
    apiKey:       cfg.infobipApiKey,
    sender:       cfg.infobipSender,
    to:           input.customerPhone,
    templateName: input.template,
    bodyParams:   Object.values(input.variables),
  })
  if (!result.ok) {
    console.error(`[customerMessaging] WhatsApp failed for job ${input.jobId}:`, result.error)
  }
}

export const customerMessaging = {
  /** Fire-and-forget — never throws, never awaited by the caller. */
  enqueue(input: SendInput): void {
    deliver(input).catch((err) => {
      console.error(`[customerMessaging] unexpected failure for job ${input.jobId}:`, err)
    })
  },
}
