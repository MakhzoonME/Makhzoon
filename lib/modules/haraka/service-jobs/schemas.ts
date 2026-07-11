import { z } from 'zod'
import type { ServiceJobStatus } from '@/types'

function coerceLocalDatetime(v: unknown): unknown {
  if (!v || typeof v !== 'string') return v
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) {
    const d = new Date(v)
    return isNaN(d.getTime()) ? v : d.toISOString()
  }
  return v
}

const VALID_TRANSITIONS: Record<ServiceJobStatus, ServiceJobStatus[]> = {
  new:         ['confirmed', 'cancelled'],
  confirmed:   ['in_progress', 'cancelled'],
  in_progress: ['done', 'cancelled'],
  done:        [],
  cancelled:   [],
}

export function isValidTransition(from: ServiceJobStatus, to: ServiceJobStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

const serviceLineSchema = z.object({
  name:           z.string().trim().min(1).max(200),
  description:    z.string().trim().max(1000).nullable().optional(),
  quantity:       z.number().positive(),
  unitPrice:      z.number().min(0),
  taxRate:        z.number().min(0).max(1).default(0),
  discountAmount: z.number().min(0).default(0),
})

const serviceAddressSchema = z.object({
  street: z.string().trim().max(200).nullable().optional(),
  area:   z.string().trim().max(100).nullable().optional(),
  city:   z.string().trim().max(100).nullable().optional(),
  notes:  z.string().trim().max(500).nullable().optional(),
})

export const createServiceJobSchema = z.object({
  serviceType:      z.string().trim().max(60).nullable().optional(),
  customerName:     z.string().trim().min(1).max(120),
  customerPhone:    z.string().trim().max(30).nullable().optional(),
  customerId:       z.string().uuid().nullable().optional(),
  staffMemberId:    z.string().nullable().optional(),
  staffMemberName:  z.string().trim().max(120).nullable().optional(),
  items:            z.array(serviceLineSchema).min(1, 'At least one service item is required'),
  paymentMethod:    z.string().max(60).nullable().optional(),
  scheduledAt:      z.preprocess(coerceLocalDatetime, z.string().datetime().nullable().optional()),
  serviceAddress:   serviceAddressSchema.nullable().optional(),
  notes:            z.string().trim().max(2000).nullable().optional(),
})

export const updateServiceJobSchema = z.object({
  serviceType:     z.string().trim().max(60).nullable().optional(),
  notes:           z.string().trim().max(2000).nullable().optional(),
  serviceAddress:  serviceAddressSchema.nullable().optional(),
  scheduledAt:     z.preprocess(coerceLocalDatetime, z.string().datetime().nullable().optional()),
  staffMemberId:   z.string().nullable().optional(),
  staffMemberName: z.string().trim().max(120).nullable().optional(),
})

export const updateServiceJobStatusSchema = z.object({
  status: z.enum(['new', 'confirmed', 'in_progress', 'done', 'cancelled']),
})

export const recordPaymentSchema = z.object({
  amountPaid:    z.number().min(0),
  paymentMethod: z.string().max(60).nullable().optional(),
})

export const addPaymentEntrySchema = z.object({
  amount:        z.number().positive(),
  paymentMethod: z.string().max(60).nullable().optional(),
  note:          z.string().trim().max(500).nullable().optional(),
})

export type CreateServiceJobPayload = z.infer<typeof createServiceJobSchema>
export type UpdateServiceJobPayload = z.infer<typeof updateServiceJobSchema>
export type UpdateServiceJobStatusPayload = z.infer<typeof updateServiceJobStatusSchema>
export type RecordPaymentPayload = z.infer<typeof recordPaymentSchema>
export type AddPaymentEntryPayload = z.infer<typeof addPaymentEntrySchema>
