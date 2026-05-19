import { z } from 'zod'

/** Rate stored as a decimal fraction: 0.16 == 16%. */
export const taxRateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  rate: z.coerce.number().min(0, 'Rate cannot be negative').max(1, 'Rate must be a fraction (0–1). Use 0.16 for 16%.'),
  isDefault: z.coerce.boolean().optional(),
})

export const taxRateUpdateSchema = taxRateSchema.partial()

export type TaxRateFormData = z.infer<typeof taxRateSchema>
