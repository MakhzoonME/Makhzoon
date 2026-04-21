import { z } from 'zod';

export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'staff']),
});

export type InviteUserFormData = z.infer<typeof inviteUserSchema>;
