import { z } from 'zod'

// Clinical free-text runs much longer than an appointment note — findings and
// a treatment plan are the substance of the record, not a margin comment.
const CLINICAL_TEXT_MAX = 8000

/**
 * A visit is always opened against an appointment: that is what keeps the
 * clinical history and the billing history describing the same event. Every
 * clinical field is optional so the record can be opened at check-in with
 * nothing but a chief complaint and filled in as the visit proceeds.
 */
export const createVisitSchema = z.object({
  appointmentId:   z.string().uuid('An appointment is required'),
  /** Defaults to the appointment's scheduled time when omitted. */
  visitDate:       z.string().datetime().nullable().optional(),
  chiefComplaint:  z.string().trim().max(CLINICAL_TEXT_MAX).nullable().optional(),
  findings:        z.string().trim().max(CLINICAL_TEXT_MAX).nullable().optional(),
  diagnosis:       z.string().trim().max(CLINICAL_TEXT_MAX).nullable().optional(),
  treatmentPlan:   z.string().trim().max(CLINICAL_TEXT_MAX).nullable().optional(),
  /** ISO date (YYYY-MM-DD) — drives the follow-ups queue. */
  followUpDue:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').nullable().optional(),
})

// appointmentId is absent: a clinical record cannot be moved to a different
// appointment. Re-pointing it would silently rewrite which visit the billing
// history describes.
export const updateVisitSchema = z.object({
  visitDate:       z.string().datetime().nullable().optional(),
  chiefComplaint:  z.string().trim().max(CLINICAL_TEXT_MAX).nullable().optional(),
  findings:        z.string().trim().max(CLINICAL_TEXT_MAX).nullable().optional(),
  diagnosis:       z.string().trim().max(CLINICAL_TEXT_MAX).nullable().optional(),
  treatmentPlan:   z.string().trim().max(CLINICAL_TEXT_MAX).nullable().optional(),
  followUpDue:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').nullable().optional(),
})

/** Notes are append-only — there is no update schema by design. */
export const addVisitNoteSchema = z.object({
  body: z.string().trim().min(1, 'A note cannot be empty').max(CLINICAL_TEXT_MAX),
})

/** Clinical attachments are patient data — keep the accepted set narrow and
 *  explicit, and validate the metadata before anything reaches storage. */
export const ALLOWED_ATTACHMENT_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
] as const

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024

/** Validates the metadata of a multipart upload (the bytes themselves are
 *  streamed, not parsed by zod). */
export const visitAttachmentSchema = z.object({
  name: z.string().trim().min(1, 'File name is required').max(255),
  type: z.enum(ALLOWED_ATTACHMENT_MIME, {
    message: 'That file type cannot be attached to a clinical record',
  }),
  size: z
    .number()
    .int()
    .positive('File is empty')
    .max(MAX_ATTACHMENT_BYTES, 'That file is larger than the 20 MB limit'),
})

export type VisitAttachmentMeta = z.infer<typeof visitAttachmentSchema>

export type CreateVisitPayload = z.infer<typeof createVisitSchema>
export type UpdateVisitPayload = z.infer<typeof updateVisitSchema>
export type AddVisitNotePayload = z.infer<typeof addVisitNoteSchema>
