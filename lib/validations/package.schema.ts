import { z } from 'zod';
import { FEATURE_KEYS, INCLUSION_KEYS } from '@/types';

export const packageLimitsSchema = z.object({
  maxAssets: z.number().int().min(-1),
  maxUsers: z.number().int().min(-1),
  maxWarranties: z.number().int().min(-1),
  maxSpaces: z.number().int().min(-1),
  maxInventoryItems: z.number().int().min(-1),
});

export const packageFeaturesSchema = z
  .object(
    FEATURE_KEYS.reduce(
      (acc, key) => ({ ...acc, [key]: z.boolean() }),
      {} as Record<(typeof FEATURE_KEYS)[number], z.ZodBoolean>,
    ),
  )
  .strict();

export const packageInclusionsSchema = z
  .object(
    INCLUSION_KEYS.reduce(
      (acc, key) => ({ ...acc, [key]: z.boolean() }),
      {} as Record<(typeof INCLUSION_KEYS)[number], z.ZodBoolean>,
    ),
  )
  .strict();

export const packagePricingSchema = z.object({
  monthlyPrice: z.number().min(0).nullable(),
  annualPrice: z.number().min(0).nullable(),
  currency: z.string().min(2).max(8),
  isCustom: z.boolean(),
});

// Partial on purpose — usoolIncluded/raseedIncluded/spacesIncluded/
// usersIncluded/reportsAvailable stay off this schema; those overlap with
// the legacy `limits` block above and aren't part of the Module Access
// rebuild (a separate cleanup, not this one).
export const packageAllowancesSchema = z
  .object({
    harakaIncludedModuleSlots: z.number().int().min(0).optional(),
    purchasesRequestsIncluded: z.boolean().optional(),
    deliveryAgentsIncluded: z.boolean().optional(),
    warrantyCertsIncluded: z.boolean().optional(),
    customizationIncluded: z.boolean().optional(),
    vehicleIntakeIncluded: z.boolean().optional(),
    loyaltyIncluded: z.boolean().optional(),
  })
  .optional();

export const packageAddOnPricesSchema = z
  .object({
    purchasesRequests: z.number().min(0).optional(),
    deliveryAgents: z.number().min(0).optional(),
    warrantyCerts: z.number().min(0).optional(),
    customization: z.number().min(0).optional(),
    vehicleIntake: z.number().min(0).optional(),
    loyalty: z.number().min(0).optional(),
    harakaModules: z
      .object({
        pos: z.number().min(0).optional(),
        services: z.number().min(0).optional(),
        orders: z.number().min(0).optional(),
        retainers: z.number().min(0).optional(),
      })
      .optional(),
  })
  .optional();

export const packageSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(0).max(500),
  isActive: z.boolean(),
  pricing: packagePricingSchema,
  trialDays: z.number().int().min(0).max(365),
  sortOrder: z.number().int().min(0),
  limits: packageLimitsSchema,
  features: packageFeaturesSchema,
  inclusions: packageInclusionsSchema,
  allowances: packageAllowancesSchema,
  addOnPrices: packageAddOnPricesSchema,
});

export const packageUpdateSchema = packageSchema.partial();

export type PackageFormData = z.infer<typeof packageSchema>;
