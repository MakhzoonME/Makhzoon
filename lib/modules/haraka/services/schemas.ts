import { z } from 'zod'

/** A bookable service needs a duration — the Appointments booking flow uses it
 *  to size the slot. Enforced here rather than as a DB CHECK so the API answers
 *  with a field-level validation error (design doc §3.2). */
const bookableNeedsDuration = {
  check: (v: { appointmentBookable?: boolean; durationMinutes?: number | null }) =>
    !v.appointmentBookable || (v.durationMinutes != null && v.durationMinutes > 0),
  message: 'Set a duration before making this service bookable as an appointment',
  path: ['durationMinutes'] as const,
}

export const createServiceSchema = z.object({
  name:        z.string().trim().min(1).max(200),
  category:    z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  price:       z.number().min(0),
  active:      z.boolean().default(true),
  durationMinutes: z.number().int().min(1).max(24 * 60).nullable().optional(),
  appointmentBookable: z.boolean().default(false),
}).refine(bookableNeedsDuration.check, {
  message: bookableNeedsDuration.message,
  path: [...bookableNeedsDuration.path],
})

export const updateServiceSchema = z.object({
  name:        z.string().trim().min(1).max(200).optional(),
  category:    z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  price:       z.number().min(0).optional(),
  active:      z.boolean().optional(),
  durationMinutes: z.number().int().min(1).max(24 * 60).nullable().optional(),
  appointmentBookable: z.boolean().optional(),
}).refine(bookableNeedsDuration.check, {
  message: bookableNeedsDuration.message,
  path: [...bookableNeedsDuration.path],
})

export type CreateServicePayload = z.infer<typeof createServiceSchema>
export type UpdateServicePayload = z.infer<typeof updateServiceSchema>
