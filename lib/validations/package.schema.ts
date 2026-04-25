import { z } from 'zod';
import { FEATURE_KEYS } from '@/types';

export const packageLimitsSchema = z.object({
  maxAssets: z.number().int().min(-1),
  maxUsers: z.number().int().min(-1),
  maxWarranties: z.number().int().min(-1),
  maxRequests: z.number().int().min(-1),
});

export const packageFeaturesSchema = z
  .object(
    FEATURE_KEYS.reduce(
      (acc, key) => ({ ...acc, [key]: z.boolean() }),
      {} as Record<(typeof FEATURE_KEYS)[number], z.ZodBoolean>,
    ),
  )
  .strict();

export const packageSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(0).max(500),
  isActive: z.boolean(),
  limits: packageLimitsSchema,
  features: packageFeaturesSchema,
});

export const packageUpdateSchema = packageSchema.partial();

export type PackageFormData = z.infer<typeof packageSchema>;
