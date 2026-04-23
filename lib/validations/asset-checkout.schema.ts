import { z } from 'zod';

export const checkoutSchema = z.object({
  checkedOutTo: z.string().min(2, 'Name or email is required').max(120),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
