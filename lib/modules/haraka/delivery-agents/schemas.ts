import { z } from 'zod'

const trimmedOptional = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .nullable()

export const deliveryAgentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  phone: trimmedOptional,
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  isActive: z.boolean().optional().default(true),
})

export const deliveryAgentUpdateSchema = deliveryAgentSchema.partial()

export type DeliveryAgentFormData = z.infer<typeof deliveryAgentSchema>
