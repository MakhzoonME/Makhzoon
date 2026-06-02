import { z } from 'zod';
import { documentsSchema } from './document.schema';

export const assetSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  category: z.string().min(1, 'Category is required'),
  // Status options are config-driven (list_key 'asset_status'); accept any
  // non-empty value so superadmin-added statuses validate. The UI constrains
  // the choices, and retire/checkout logic still keys off 'Active'/'Retired'.
  status: z.string().min(1, 'Status is required'),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseCost: z.coerce.number().positive('Cost must be positive').optional().or(z.literal('')),
  assignedTo: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  documents: documentsSchema,
});

export type AssetFormData = z.infer<typeof assetSchema>;
