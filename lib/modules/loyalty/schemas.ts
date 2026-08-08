import { z } from 'zod'

export const loyaltyTierThresholdSchema = z.object({
  tier:      z.string().trim().min(1).max(40),
  minPoints: z.number().int().min(0),
})

export const updateLoyaltyProgramSchema = z.object({
  enabled:            z.boolean().optional(),
  pointsPerCurrency:  z.number().min(0).optional(),
  tiers:              z.array(loyaltyTierThresholdSchema).min(1).optional(),
})

export const enrollMemberSchema = z.object({
  customerId: z.string().uuid(),
})

export type UpdateLoyaltyProgramPayload = z.infer<typeof updateLoyaltyProgramSchema>
export type EnrollMemberPayload = z.infer<typeof enrollMemberSchema>
