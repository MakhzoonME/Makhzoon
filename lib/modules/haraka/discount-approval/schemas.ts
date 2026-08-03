import { z } from 'zod'

export const setDiscountPinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits').nullable(),
})
