import { z } from 'zod';

const phoneRegex = /^\+[1-9]\d{7,14}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const inviteUserSchema = z
  .object({
    email: z.string().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    channel: z.enum(['email', 'sms', 'whatsapp']),
    displayName: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['org_owner', 'admin', 'staff']),
  })
  .superRefine((d, ctx) => {
    const hasEmail = !!d.email?.trim();
    const hasPhone = !!d.phone?.trim();

    if (!hasEmail && !hasPhone) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Email or phone number is required' });
      return;
    }
    if (hasEmail && !emailRegex.test(d.email!)) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Invalid email address' });
    }
    if (hasPhone && !phoneRegex.test(d.phone!)) {
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'Phone must be in E.164 format (e.g. +966501234567)',
      });
    }
    if (d.channel === 'email' && !hasEmail) {
      ctx.addIssue({ code: 'custom', path: ['channel'], message: 'Email required for email channel' });
    }
    if ((d.channel === 'sms' || d.channel === 'whatsapp') && !hasPhone) {
      ctx.addIssue({ code: 'custom', path: ['channel'], message: 'Phone required for this channel' });
    }
  });

export type InviteUserFormData = z.infer<typeof inviteUserSchema>;
