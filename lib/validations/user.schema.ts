import { z } from 'zod';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-z0-9_]{3,30}$/;

export const inviteUserSchema = z
  .object({
    email: z.string().optional().or(z.literal('')),
    username: z.string().optional().or(z.literal('')),
    displayName: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['org_owner', 'admin', 'staff']),
  })
  .superRefine((d, ctx) => {
    const hasEmail = !!d.email?.trim();
    const hasUsername = !!d.username?.trim();

    if (!hasEmail && !hasUsername) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Email or username is required' });
      return;
    }
    if (hasEmail && !emailRegex.test(d.email!)) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Invalid email address' });
    }
    if (hasUsername && !usernameRegex.test(d.username!)) {
      ctx.addIssue({
        code: 'custom',
        path: ['username'],
        message: 'Username must be 3-30 lowercase letters, numbers, or underscores',
      });
    }
  });

export type InviteUserFormData = z.infer<typeof inviteUserSchema>;
