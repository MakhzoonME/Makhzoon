import { z } from 'zod'

const trimmedOptional = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .nullable()

export const staffCapabilitySchema = z.enum([
  'delivery',
  'service_job',
  'appointment_provider',
])

export const staffSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  phone: trimmedOptional,
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  /** Defaults to ['delivery'] so the legacy delivery-agent API keeps producing
   *  delivery-capable records when a caller doesn't send the field. */
  capabilities: z.array(staffCapabilitySchema).default(['delivery']),
  isActive: z.boolean().optional().default(true),
})

export const staffUpdateSchema = staffSchema.partial()

/** 'HH:mm' or 'HH:mm:ss' — what both <input type="time"> and Postgres `time` produce. */
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Expected HH:mm')
  .transform((v) => v.slice(0, 5))

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

export const staffAvailabilitySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeString,
    endTime: timeString,
  })
  .refine((v) => v.endTime > v.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  })

export const staffAvailabilityExceptionSchema = z
  .object({
    exceptionDate: dateString,
    // Both omitted = full day off; both present = replacement hours.
    startTime: timeString.nullable().optional(),
    endTime: timeString.nullable().optional(),
    reason: z.string().trim().max(300).nullable().optional(),
  })
  .refine((v) => (v.startTime == null) === (v.endTime == null), {
    message: 'Set both a start and an end time, or neither (full day off)',
    path: ['endTime'],
  })
  .refine((v) => v.startTime == null || v.endTime == null || v.endTime > v.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  })

export type StaffFormData = z.infer<typeof staffSchema>
export type StaffAvailabilityPayload = z.infer<typeof staffAvailabilitySchema>
export type StaffAvailabilityExceptionPayload = z.infer<typeof staffAvailabilityExceptionSchema>
