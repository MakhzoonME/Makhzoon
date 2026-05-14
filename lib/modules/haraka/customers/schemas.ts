import { z } from 'zod'

const trimmedOptional = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .nullable()

export const customerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  phone: trimmedOptional,
  email: z
    .string()
    .trim()
    .max(160)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null))
    .refine(
      (v) => v == null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      { message: 'Invalid email address' },
    ),
  taxNumber: trimmedOptional,
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
})

export const customerUpdateSchema = customerSchema.partial()

export type CustomerFormData = z.infer<typeof customerSchema>
