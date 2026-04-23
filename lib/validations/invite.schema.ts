import { z } from 'zod';

export const createInviteSchema = z.object({
  email: z.string().email('Invalid email'),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.enum(['admin', 'staff']),
});

export const acceptInviteSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export type CreateInviteFormData = z.infer<typeof createInviteSchema>;
export type AcceptInviteFormData = z.infer<typeof acceptInviteSchema>;
