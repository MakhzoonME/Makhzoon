import { z } from 'zod'

export const serviceNotificationConfigPatchSchema = z.object({
  whatsappEnabled:         z.boolean().optional(),
  whatsappPhoneNumberId:   z.string().trim().max(60).nullable().optional(),
  whatsappToken:           z.string().trim().min(1).optional(), // omit to keep existing
  whatsappWebhookSecret:   z.string().trim().min(8).optional(),
  ocrProvider:             z.string().trim().max(40).optional(),
  ocrApiKey:               z.string().trim().min(1).optional(), // omit to keep existing
})

export type ServiceNotificationConfigPatch = z.infer<typeof serviceNotificationConfigPatchSchema>
