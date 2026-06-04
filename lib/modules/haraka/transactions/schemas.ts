import { z } from 'zod'

export const cartLineSchema = z.object({
  itemId: z.string().min(1),
  itemName: z.string().min(1),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  taxRateId: z.string().nullable().optional(),
  taxRate: z.coerce.number().min(0).max(1),
  discount: z.coerce.number().min(0),
})

export const paymentSchema = z.object({
  method: z.enum(['cash', 'card', 'other']),
  amount: z.coerce.number().min(0),
  reference: z.string().nullable().optional(),
  cardLast4: z
    .string()
    .regex(/^\d{4}$/, 'Card last4 must be exactly 4 digits')
    .nullable()
    .optional()
    .or(z.literal('')),
})

export const completeSaleSchema = z.object({
  sessionId: z.string().min(1, 'Open a session before processing sales'),
  customerId: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  lines: z.array(cartLineSchema).min(1, 'Cart cannot be empty'),
  payments: z.array(paymentSchema).min(1, 'At least one payment is required'),
  /** Client-supplied idempotency key (UUID) so a duplicate Submit doesn't double-charge. */
  offlineId: z.string().min(8),
  /** When true the cashier has chosen to bypass Fawtara for this sale. */
  skipFawtara: z.boolean().optional(),
})

export const refundSchema = z.object({
  /** When omitted, refund the full sale. Otherwise refund only these line indexes (full quantities). */
  lineIndexes: z.array(z.number().int().min(0)).optional(),
  reason: z.string().min(1).optional(),
})

export type CompleteSalePayload = z.infer<typeof completeSaleSchema>
export type RefundPayload = z.infer<typeof refundSchema>
