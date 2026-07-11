import { z } from 'zod'

export const cardTerminalConfigSchema = z.object({
  enabled:        z.boolean().optional(),
  mode:           z.enum(['display', 'local_bridge', 'cloud', 'webhook']).optional(),
  bridgeUrl:      z.string().url().nullable().optional(),
  provider:       z.enum(['sumup', 'square', 'paymob', 'custom']).nullable().optional(),
  apiKey:         z.string().min(1).nullable().optional(),   // write-only; null clears it
  terminalId:     z.string().max(120).nullable().optional(),
  webhookSecret:  z.string().min(8).nullable().optional(),   // write-only; null clears it
  currency:       z.string().length(3).optional(),
  timeoutSeconds: z.number().int().min(10).max(300).optional(),
})

export const initiateChargeSchema = z.object({
  reference: z.string().min(1),
  amount:    z.number().positive(),
  currency:  z.string().length(3).optional(),
})

export type CardTerminalConfigPatch = z.infer<typeof cardTerminalConfigSchema>
export type InitiateChargeInput   = z.infer<typeof initiateChargeSchema>
