import { z } from 'zod';

const usernameRegex = /^[a-z0-9_]{3,30}$/;

export const createInviteSchema = z
  .object({
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    username: z
      .string()
      .regex(usernameRegex, 'Username must be 3-30 lowercase letters, numbers, or underscores')
      .optional()
      .or(z.literal('')),
    displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
    role: z.enum(['org_owner', 'admin', 'staff']),
    // Custom per-module permissions stored on the invite and transferred to the user on accept.
    // Zod strips unknown fields by default — this field MUST be declared here or it silently vanishes.
    permissions: z.record(z.string(), z.record(z.string(), z.boolean())).optional().nullable(),
  })
  .refine((d) => d.email || d.username, {
    message: 'Either email or username is required',
    path: ['email'],
  });

export const acceptInviteSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
