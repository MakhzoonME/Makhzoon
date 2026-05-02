import { z } from 'zod';
import { ORG_CATEGORIES } from '@/types';

export const organizationSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    subdomain: z
      .string()
      .min(2, 'Subdomain must be at least 2 characters')
      .max(50, 'Subdomain must be at most 50 characters')
      .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),
    contactEmail: z.string().email('Invalid email address'),
    description: z.string().max(500).nullable().optional(),
    category: z.enum(ORG_CATEGORIES).nullable().optional(),
    packageDetails: z.string().optional(),
    subscriptionStartDate: z.string().min(1, 'Start date is required'),
    subscriptionEndDate: z.string().min(1, 'End date is required'),
  })
  .refine((data) => new Date(data.subscriptionEndDate) > new Date(data.subscriptionStartDate), {
    message: 'End date must be after start date',
    path: ['subscriptionEndDate'],
  });

export type OrganizationFormData = z.infer<typeof organizationSchema>;

// For updates from the super-admin edit page (no subscription dates required)
export const organizationUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  contactEmail: z.string().email().optional(),
  description: z.string().max(500).nullable().optional(),
  category: z.enum(ORG_CATEGORIES).nullable().optional(),
  assignedMemberId: z.string().nullable().optional(),
});

export type OrganizationUpdateFormData = z.infer<typeof organizationUpdateSchema>;
