import { z } from 'zod';

export const maintenanceRecordSchema = z.object({
  type: z.enum(['repair', 'service', 'inspection', 'upgrade', 'other']),
  description: z.string().min(2, 'Description is required').max(500, 'Description is too long'),
  performedBy: z.string().max(120).optional(),
  cost: z.coerce.number().nonnegative('Cost cannot be negative').optional().or(z.literal('')),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

export type MaintenanceFormData = z.infer<typeof maintenanceRecordSchema>;
