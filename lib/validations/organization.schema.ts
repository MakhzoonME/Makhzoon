import { z } from 'zod';
import { ORG_CATEGORIES, type OrgCategory } from '@/types';

/**
 * Maps a category to its canonical casing (e.g. seed value "technology" →
 * enum "Technology"), so existing orgs saved with legacy/seed casing still
 * match. Returns null for empty/unmatched input.
 */
export function normalizeCategory(v: string | null | undefined): OrgCategory | null {
  if (!v) return null;
  return ORG_CATEGORIES.find((c) => c.toLowerCase() === v.toLowerCase()) ?? null;
}

// Category, tolerant of legacy/seed values stored with different casing (e.g.
// lowercase "technology"). Normalizes case-insensitively to the canonical enum
// value so existing orgs can be edited without a manual data migration; still
// rejects values that don't match any category at all.
export const categorySchema = z.preprocess((v) => {
  if (typeof v !== 'string' || v === '') return v;
  return ORG_CATEGORIES.find((c) => c.toLowerCase() === v.toLowerCase()) ?? v;
}, z.enum(ORG_CATEGORIES).nullable().optional());

export const organizationSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    subdomain: z
      .string()
      .min(2, 'Workspace ID must be at least 2 characters')
      .max(50, 'Workspace ID must be at most 50 characters')
      .regex(/^[a-z0-9-]+$/, 'Workspace ID can only contain lowercase letters, numbers, and hyphens'),
    contactEmail: z.string().email('Invalid email address'),
    description: z.string().max(500).nullable().optional(),
    category: categorySchema,
    packageId: z.string().nullable().optional(),
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
  category: categorySchema,
  assignedMemberId: z.string().nullable().optional(),
});

export type OrganizationUpdateFormData = z.infer<typeof organizationUpdateSchema>;
