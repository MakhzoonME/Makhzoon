import { z } from 'zod'
import type { RetainerStatus } from '@/types'

const VALID_STATUS_TRANSITIONS: Record<RetainerStatus, RetainerStatus[]> = {
  active:    ['paused', 'cancelled'],
  paused:    ['active', 'cancelled'],
  cancelled: [],
  expired:   [],
}

export function isValidRetainerTransition(from: RetainerStatus, to: RetainerStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export const createRetainerSchema = z.object({
  name:             z.string().trim().min(1).max(200),
  customerName:     z.string().trim().min(1).max(120),
  customerPhone:    z.string().trim().max(30).nullable().optional(),
  customerId:       z.string().uuid().nullable().optional(),
  staffMemberId:    z.string().nullable().optional(),
  staffMemberName:  z.string().trim().max(120).nullable().optional(),
  billingCycle:     z.enum(['monthly', 'quarterly', 'annual']),
  amountPerCycle:   z.number().positive(),
  taxRate:          z.number().min(0).max(1).default(0),
  startDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  endDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes:            z.string().trim().max(2000).nullable().optional(),
})

export const updateRetainerSchema = z.object({
  name:             z.string().trim().min(1).max(200).optional(),
  staffMemberId:    z.string().nullable().optional(),
  staffMemberName:  z.string().trim().max(120).nullable().optional(),
  endDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes:            z.string().trim().max(2000).nullable().optional(),
})

export const updateRetainerStatusSchema = z.object({
  status: z.enum(['active', 'paused', 'cancelled', 'expired']),
})

export const createRetainerInvoiceSchema = z.object({
  billingPeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  billingPeriodEnd:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes:              z.string().trim().max(2000).nullable().optional(),
})

export const updateRetainerInvoiceSchema = z.object({
  paymentStatus: z.enum(['unpaid', 'partial', 'paid']).optional(),
  amountPaid:    z.number().min(0).optional(),
  paymentMethod: z.string().max(60).nullable().optional(),
  paidAt:        z.string().datetime().nullable().optional(),
  notes:         z.string().trim().max(2000).nullable().optional(),
})

export type CreateRetainerPayload    = z.infer<typeof createRetainerSchema>
export type UpdateRetainerPayload    = z.infer<typeof updateRetainerSchema>
export type UpdateRetainerStatusPayload  = z.infer<typeof updateRetainerStatusSchema>
export type CreateRetainerInvoicePayload = z.infer<typeof createRetainerInvoiceSchema>
export type UpdateRetainerInvoicePayload = z.infer<typeof updateRetainerInvoiceSchema>
