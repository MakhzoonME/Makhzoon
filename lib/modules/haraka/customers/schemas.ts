import { z } from 'zod'

const trimmedOptional = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .nullable()

export const customerSchema = z.object({
  // Not hardcoded required — whether it (or any other default field) is
  // required or hidden is configurable per org (see required-fields.ts) and
  // enforced dynamically by CustomersService, since hidden overrides required.
  name: z.string().trim().max(120).optional().nullable().transform((v) => v ?? ''),
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
