import { z } from 'zod'

export const createStockAuditSchema = z.object({
  title: z.string().trim().min(2).max(100),
  notes: z.string().optional(),
  itemIds: z.array(z.string().uuid()).min(1, 'Select at least one item'),
})

export const submitStockAuditItemSchema = z.object({
  auditItemId: z.string().uuid(),
  countedQuantity: z.coerce.number().min(0, 'Counted quantity cannot be negative'),
  note: z.string().optional(),
})

/** Per-row decision used on complete: 'apply' | 'skip' | <override number>. */
export const stockAuditAdjustmentSchema = z.union([
  z.literal('apply'),
  z.literal('skip'),
  z.coerce.number().min(0),
])

export const completeStockAuditSchema = z.object({
  action: z.literal('complete'),
  adjustments: z.record(z.string(), stockAuditAdjustmentSchema).default({}),
})

export type CreateStockAuditFormData = z.infer<typeof createStockAuditSchema>
export type SubmitStockAuditItemFormData = z.infer<typeof submitStockAuditItemSchema>
export type CompleteStockAuditFormData = z.infer<typeof completeStockAuditSchema>
