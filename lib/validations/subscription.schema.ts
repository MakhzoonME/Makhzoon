import { z } from 'zod';

export const subscriptionStatusEnum = z.enum(['ACTIVE', 'EXPIRED', 'SUSPENDED']);

const dateInput = z.union([z.string().datetime(), z.string().date(), z.date()]).transform((v) =>
  v instanceof Date ? v : new Date(v),
);

export const subscriptionUpdateSchema = z
  .object({
    packageId: z.string().min(1).nullable().optional(),
    startDate: dateInput.optional(),
    endDate: dateInput.optional(),
    status: subscriptionStatusEnum.optional(),
    notes: z.string().max(500).nullable().optional(),
    features: z.record(z.string(), z.boolean()).optional(),
  })
  .refine(
    (data) =>
      !data.startDate ||
      !data.endDate ||
      new Date(data.endDate).getTime() > new Date(data.startDate).getTime(),
    { message: 'End date must be after start date', path: ['endDate'] },
  );

export type SubscriptionUpdateFormData = z.infer<typeof subscriptionUpdateSchema>;
