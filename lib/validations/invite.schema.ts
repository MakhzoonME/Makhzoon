import { z } from 'zod';

const phoneRegex = /^\+[1-9]\d{7,14}$/;

export const createInviteSchema = z
  .object({
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z
      .string()
      .regex(phoneRegex, 'Phone must be in E.164 format (e.g. +966501234567)')
      .optional()
      .or(z.literal('')),
    channel: z.enum(['email', 'sms', 'whatsapp']).optional(),
    displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
    role: z.enum(['org_owner', 'admin', 'staff']),
  })
  .refine((d) => d.email || d.phone, {
    message: 'Either email or phone number is required',
    path: ['email'],
  });

export const acceptInviteSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('password'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  }),
  z.object({
    method: z.literal('phone'),
    idToken: z.string().min(1),
  }),
]);

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
