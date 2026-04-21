import { z } from 'zod';

export const warrantySchema = z.object({
  assetId: z.string().min(1, 'Asset is required'),
  vendor: z.string().min(1, 'Vendor is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reminder: z.boolean().default(true),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

export type WarrantyFormData = z.infer<typeof warrantySchema>;
