import { z } from 'zod'

export const openSessionSchema = z.object({
  openingFloat: z.coerce.number().min(0, 'Opening float cannot be negative'),
  locationId: z.string().optional(),
})

export const closeSessionSchema = z.object({
  closingFloat: z.coerce.number().min(0, 'Counted cash cannot be negative'),
  notes: z.string().trim().optional().nullable(),
})

export type OpenSessionFormData = z.infer<typeof openSessionSchema>
export type CloseSessionFormData = z.infer<typeof closeSessionSchema>
