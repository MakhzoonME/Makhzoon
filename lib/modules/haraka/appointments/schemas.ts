import { z } from 'zod'
import type { AppointmentStatus } from '@/types'

// datetime-local inputs produce "YYYY-MM-DDTHH:mm" (no seconds, no zone) —
// same coercion Orders and Service Jobs use.
function coerceLocalDatetime(v: unknown): unknown {
  if (!v || typeof v !== 'string') return v
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) {
    const d = new Date(v)
    return isNaN(d.getTime()) ? v : d.toISOString()
  }
  return v
}

/**
 * Status machine (design doc §4.3). `completed` is the only state that
 * unlocks invoice generation; cancelled and no_show are terminal and free the
 * slot for rebooking.
 */
const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show:   [],
}

export function isValidAppointmentTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export const createAppointmentSchema = z.object({
  customerId:     z.string().uuid().nullable().optional(),
  // Optional customer record, but a name is always required so walk-ins are
  // still identifiable on the calendar (design doc §10).
  customerName:   z.string().trim().min(1, 'Customer name is required').max(120),
  customerPhone:  z.string().trim().max(30).nullable().optional(),
  serviceId:      z.string().uuid('Pick a bookable service'),
  staffId:        z.string().uuid('Pick a provider'),
  scheduledAt:    z.preprocess(coerceLocalDatetime, z.string().datetime()),
  /** Overrides the catalog duration for this one booking. */
  durationMinutes: z.number().int().min(1).max(24 * 60).nullable().optional(),
  notes:          z.string().trim().max(2000).nullable().optional(),
})

export const updateAppointmentSchema = z.object({
  customerName:    z.string().trim().min(1).max(120).optional(),
  customerPhone:   z.string().trim().max(30).nullable().optional(),
  scheduledAt:     z.preprocess(coerceLocalDatetime, z.string().datetime().optional()),
  durationMinutes: z.number().int().min(1).max(24 * 60).optional(),
  staffId:         z.string().uuid().optional(),
  notes:           z.string().trim().max(2000).nullable().optional(),
})

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']),
})

export const addAppointmentPaymentSchema = z.object({
  amount:        z.number().positive(),
  paymentMethod: z.string().max(60).nullable().optional(),
  note:          z.string().trim().max(500).nullable().optional(),
})

export type CreateAppointmentPayload = z.infer<typeof createAppointmentSchema>
export type UpdateAppointmentPayload = z.infer<typeof updateAppointmentSchema>
export type UpdateAppointmentStatusPayload = z.infer<typeof updateAppointmentStatusSchema>
export type AddAppointmentPaymentPayload = z.infer<typeof addAppointmentPaymentSchema>
