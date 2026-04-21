import { z } from 'zod';

export const requestSchema = z.object({
  type: z.enum(['REFILL', 'RETIRE', 'BUY_NEW', 'EXTEND_WARRANTY']),
  assetId: z.string().optional(),
  warrantyId: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
});

export type RequestFormData = z.infer<typeof requestSchema>;
