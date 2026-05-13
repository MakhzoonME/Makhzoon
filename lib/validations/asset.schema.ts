import { z } from 'zod';

export const assetSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  category: z.string().min(1, 'Category is required'),
  status: z.enum(['Active', 'Retired']),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseCost: z.coerce.number().positive('Cost must be positive').optional().or(z.literal('')),
  assignedTo: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export type AssetFormData = z.infer<typeof assetSchema>;
