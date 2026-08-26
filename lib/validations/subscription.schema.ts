import { z } from 'zod';
import { HARAKA_MODULES, type HarakaModule } from '@/types';

export const subscriptionStatusEnum = z.enum([
  'ACTIVE',
  'GRACE',
  'READ_ONLY',
  'EXPIRED',
  'SUSPENDED',
  'CANCELLED',
]);

// Derived from HARAKA_MODULES rather than re-listed, so adding a module to the
// type can't leave this validator rejecting it (as 'appointments' did).
const harakaModuleEnum = z.enum(HARAKA_MODULES as [HarakaModule, ...HarakaModule[]]);

const dateInput = z.union([z.string().datetime(), z.string().date(), z.date()]).transform((v) =>
  v instanceof Date ? v : new Date(v),
);

// Per-org limit overrides — null/absent means "use the plan's included value".
const limitOverridesSchema = z
  .object({
    usool: z.number().int().min(0).nullable().optional(),
    raseed: z.number().int().min(0).nullable().optional(),
    users: z.number().int().min(0).nullable().optional(),
    spaces: z.number().int().min(0).nullable().optional(),
  })
  .optional();

const addOnsSchema = z
  .object({
    deliveryAgents: z.boolean().optional(),
    warrantyCerts: z.boolean().optional(),
    customization: z.boolean().optional(),
    purchasesRequests: z.boolean().optional(),
    vehicleIntake: z.boolean().optional(),
    documentReports: z.boolean().optional(),
    extraHarakaModules: z.array(harakaModuleEnum).optional(),
    extraUsers: z.number().int().min(0).optional(),
    extraSpaces: z.number().int().min(0).optional(),
  })
  .optional();

export const subscriptionUpdateSchema = z
  .object({
    packageId: z.string().min(1).nullable().optional(),
    startDate: dateInput.optional(),
    endDate: dateInput.optional(),
    status: subscriptionStatusEnum.optional(),
    notes: z.string().max(500).nullable().optional(),
    features: z.record(z.string(), z.boolean()).optional(),
    // Pricing-model fields.
    activeHarakaModules: z.array(harakaModuleEnum).optional(),
    activeAddOns: addOnsSchema,
    limitOverrides: limitOverridesSchema,
  })
  .refine(
    (data) =>
      !data.startDate ||
      !data.endDate ||
      new Date(data.endDate).getTime() > new Date(data.startDate).getTime(),
    { message: 'End date must be after start date', path: ['endDate'] },
  );

export type SubscriptionUpdateFormData = z.infer<typeof subscriptionUpdateSchema>;
