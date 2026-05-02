import { z } from 'zod';

export const selfServeSignupSchema = z.object({
  orgName: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  subdomain: z
    .string()
    .min(3, 'Workspace ID must be at least 3 characters')
    .max(40)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Lowercase letters, numbers, and hyphens only'),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export type SelfServeSignupData = z.infer<typeof selfServeSignupSchema>;
