import { z } from 'zod'

export const reportFieldConditionSchema = z.object({
  parentFieldKey: z.string().min(1),
  operator: z.enum(['equals', 'not_equals', 'in', 'is_true', 'is_false']),
  value: z.union([z.string(), z.array(z.string())]).optional(),
})

export const reportFieldOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  labelAr: z.string().optional(),
})

export const reportFieldDefSchema = z.object({
  fieldKey: z.string().min(1).max(50).regex(/^[a-z_][a-z0-9_]*$/, 'Must be snake_case'),
  type: z.enum(['text', 'textarea', 'number', 'select', 'multi_select', 'date', 'boolean', 'user']),
  label: z.string().min(1).max(100),
  labelAr: z.string().max(100).optional(),
  required: z.boolean().default(false),
  options: z.array(reportFieldOptionSchema).optional(),
  placeholder: z.string().max(200).optional(),
  placeholderAr: z.string().max(200).optional(),
  condition: reportFieldConditionSchema.nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
})

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  fieldSchema: z.array(reportFieldDefSchema).default([]),
})

export const updateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  fieldSchema: z.array(reportFieldDefSchema).optional(),
  isActive: z.boolean().optional(),
})

export const reportAttachmentSchema = z.object({
  bucket: z.string().min(1),
  path: z.string().min(1),
  name: z.string().min(1).max(200),
  contentType: z.string().max(100),
  url: z.string().url().optional(),
  public: z.boolean(),
})

export const createInstanceSchema = z.object({
  templateId: z.string().uuid(),
  customerId: z.string().uuid(),
  encounterType: z.enum(['appointment', 'service_job', 'order', 'visit']),
  encounterId: z.string().uuid(),
  fieldValues: z.record(z.string(), z.unknown()).default({}),
  attachments: z.array(reportAttachmentSchema).default([]),
})

export const updateInstanceSchema = z.object({
  fieldValues: z.record(z.string(), z.unknown()).optional(),
  attachments: z.array(reportAttachmentSchema).optional(),
})

export type CreateTemplatePayload = z.infer<typeof createTemplateSchema>
export type UpdateTemplatePayload = z.infer<typeof updateTemplateSchema>
export type CreateInstancePayload = z.infer<typeof createInstanceSchema>
export type UpdateInstancePayload = z.infer<typeof updateInstanceSchema>
