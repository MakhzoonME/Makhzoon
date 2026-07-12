import { z } from 'zod'

// datetime-local inputs produce "YYYY-MM-DDTHH:mm" (no seconds, no tz).
// Zod's .datetime() requires a full ISO string — coerce before validating.
function coerceLocalDatetime(v: unknown): unknown {
  if (!v || typeof v !== 'string') return v
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) {
    const d = new Date(v)
    return isNaN(d.getTime()) ? v : d.toISOString()
  }
  return v
}

// Product lines mirror the register cart line (transactions/schemas.ts) so a
// ticket's items can flow into completeSale unchanged at checkout.
const productLineSchema = z.object({
  itemId:    z.string().min(1),
  itemName:  z.string().min(1).max(200),
  sku:       z.string().max(100).nullable().optional(),
  barcode:   z.string().max(100).nullable().optional(),
  quantity:  z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  taxRateId: z.string().nullable().optional(),
  taxRate:   z.coerce.number().min(0).max(1).default(0),
  discount:  z.coerce.number().min(0).default(0),
})

// Service lines mirror service-jobs lines (free text, not inventory-linked).
const serviceLineSchema = z.object({
  name:           z.string().trim().min(1).max(200),
  description:    z.string().trim().max(1000).nullable().optional(),
  quantity:       z.coerce.number().positive(),
  unitPrice:      z.coerce.number().min(0),
  taxRate:        z.coerce.number().min(0).max(1).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
})

const ticketBodySchema = z.object({
  customerName:  z.string().trim().max(120).nullable().optional(),
  customerPhone: z.string().trim().max(30).nullable().optional(),
  carPlate:      z.string().trim().max(30).nullable().optional(),
  customerId:    z.string().uuid().nullable().optional(),
  items:         z.array(productLineSchema).default([]),
  serviceItems:  z.array(serviceLineSchema).default([]),
  scheduledAt:   z.preprocess(coerceLocalDatetime, z.string().datetime().nullable().optional()),
  notes:         z.string().trim().max(2000).nullable().optional(),
})

// At least one searchable customer identifier so the ticket can be found later.
function hasIdentity(v: { customerName?: string | null; customerPhone?: string | null; carPlate?: string | null }) {
  return !!(v.customerName?.trim() || v.customerPhone?.trim() || v.carPlate?.trim())
}

export const createTicketSchema = ticketBodySchema
  .refine((v) => v.items.length > 0 || v.serviceItems.length > 0, {
    message: 'Add at least one product or service', path: ['items'],
  })
  .refine(hasIdentity, {
    message: 'Enter at least one of: customer name, phone number, or car plate',
    path: ['customerName'],
  })

export const updateTicketSchema = ticketBodySchema.partial()
  .refine(
    (v) => {
      if (v.items === undefined && v.serviceItems === undefined) return true
      return (v.items?.length ?? 0) > 0 || (v.serviceItems?.length ?? 0) > 0
    },
    { message: 'Add at least one product or service', path: ['items'] },
  )
  .refine(
    (v) => {
      // Only enforce when the identity fields are part of the patch.
      if (v.customerName === undefined && v.customerPhone === undefined && v.carPlate === undefined) return true
      return hasIdentity(v)
    },
    {
      message: 'Enter at least one of: customer name, phone number, or car plate',
      path: ['customerName'],
    },
  )

export const cancelTicketSchema = z.object({
  status: z.literal('cancelled'),
})

export const checkoutTicketSchema = z.object({
  sessionId: z.string().min(1, 'Open a session before collecting payment'),
  payments: z
    .array(
      z.object({
        method:    z.enum(['cash', 'card', 'other']),
        amount:    z.coerce.number().min(0),
        reference: z.string().nullable().optional(),
        cardLast4: z
          .string()
          .regex(/^\d{4}$/, 'Card last4 must be exactly 4 digits')
          .nullable()
          .optional()
          .or(z.literal('')),
      }),
    )
    .min(1, 'At least one payment is required'),
  /** Client-supplied idempotency key (UUID) so a duplicate Submit doesn't double-charge. */
  offlineId:   z.string().min(8),
  skipFawtara: z.boolean().optional(),
})

export type CreateTicketPayload = z.infer<typeof createTicketSchema>
export type UpdateTicketPayload = z.infer<typeof updateTicketSchema>
export type CheckoutTicketPayload = z.infer<typeof checkoutTicketSchema>
