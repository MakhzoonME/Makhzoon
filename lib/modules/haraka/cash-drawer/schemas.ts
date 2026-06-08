import { z } from 'zod'

export const cashDrawerConfigSchema = z.object({
  enabled:          z.boolean(),
  autoOpenOnCash:   z.boolean(),
  requirePin:       z.boolean(),
  pin:              z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits').nullable().optional(),
  drawerPort:       z.union([z.literal(0), z.literal(1)]),
  onTimeMs:         z.number().int().min(10).max(510),
  offTimeMs:        z.number().int().min(10).max(510),
})

export const cashDrawerConfigUpdateSchema = cashDrawerConfigSchema.partial()

export const verifyPinSchema = z.object({
  pin: z.string().min(4).max(6),
})

export type CashDrawerConfigData = z.infer<typeof cashDrawerConfigSchema>
