import { z } from 'zod'

export const createServiceSchema = z.object({
  name:        z.string().trim().min(1).max(200),
  category:    z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  price:       z.number().min(0),
  taxRateId:   z.string().uuid().nullable().optional().or(z.literal('')),
  active:      z.boolean().default(true),
})

export const updateServiceSchema = z.object({
  name:        z.string().trim().min(1).max(200).optional(),
  category:    z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  price:       z.number().min(0).optional(),
  taxRateId:   z.string().uuid().nullable().optional().or(z.literal('')),
  active:      z.boolean().optional(),
})

export type CreateServicePayload = z.infer<typeof createServiceSchema>
export type UpdateServicePayload = z.infer<typeof updateServiceSchema>
