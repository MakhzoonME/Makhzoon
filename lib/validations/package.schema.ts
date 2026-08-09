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

// Partial on purpose — only the add-ons actually editable from PackageForm
// today (vehicleIntake, loyalty). The other PackageAllowances/AddOnPrices
// keys (deliveryAgents, warrantyCerts, customization, ...) aren't in this
// form yet either; add them here alongside their form fields when they are.
export const packageAllowancesSchema = z
  .object({
    vehicleIntakeIncluded: z.boolean().optional(),
    loyaltyIncluded: z.boolean().optional(),
  })
  .optional();

export const packageAddOnPricesSchema = z
  .object({
    vehicleIntake: z.number().min(0).optional(),
    loyalty: z.number().min(0).optional(),
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
