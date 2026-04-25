import { z } from 'zod';

export const paymentLogMethodEnum = z.enum(['CARD', 'BANK_TRANSFER', 'MANUAL', 'OTHER']);

export const paymentLogSchema = z.object({
  subscriptionId: z.string().min(1),
  amount: z.number().positive(),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter ISO code')
    .transform((v) => v.toUpperCase()),
  method: paymentLogMethodEnum,
  reference: z.string().max(100).nullable().optional(),
  paidAt: z
    .union([z.string().datetime(), z.string().date(), z.date()])
    .transform((v) => (v instanceof Date ? v : new Date(v))),
  notes: z.string().max(500).nullable().optional(),
});

export type PaymentLogFormData = z.infer<typeof paymentLogSchema>;
