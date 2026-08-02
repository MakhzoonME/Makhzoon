import { z } from 'zod';

export const customFieldOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  labelAr: z.string().optional(),
  color: z.string().optional(),
});

export const createCustomFieldSchema = z.object({
  module: z.enum(['assets', 'inventory', 'requests', 'customers']),
  fieldKey: z.string().min(1).max(50).regex(/^[a-z_][a-z0-9_]*$/, 'Must be snake_case'),
  type: z.enum(['text', 'number', 'select', 'multi_select', 'date', 'boolean', 'user']),
  label: z.string().min(1).max(100),
  labelAr: z.string().max(100).optional(),
  required: z.boolean().default(false),
  options: z.array(customFieldOptionSchema).optional(),
  placeholder: z.string().max(200).optional(),
  placeholderAr: z.string().max(200).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCustomFieldSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  labelAr: z.string().max(100).optional(),
  required: z.boolean().optional(),
  options: z.array(customFieldOptionSchema).optional(),
  placeholder: z.string().max(200).optional(),
  placeholderAr: z.string().max(200).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
