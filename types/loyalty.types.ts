// Loyalty module — independent of Haraka, hangs off pos_customers only.
// Usable by any org (retail or service-based) that enables the 'loyalty'
// feature flag.

export interface LoyaltyTierThreshold {
  tier: string
  minPoints: number
}

export interface LoyaltyProgram {
  organizationId:    string
  enabled:            boolean
  pointsPerCurrency:  number
  tiers:              LoyaltyTierThreshold[]
  updatedAt:          Date
  updatedBy:          string | null
}

export interface LoyaltyMember {
  id:             string
  organizationId: string
  customerId:     string
  cardNumber:     string
  tier:           string
  pointsBalance:  number
  enrolledAt:     Date
  updatedAt:      Date
}

export interface LoyaltyTransaction {
  id:              string
  organizationId:  string
  memberId:        string
  delta:           number
  reason:          string
  sourceModule:    string | null
  sourceRecordId:  string | null
  createdAt:       Date
  createdBy:       string | null
}
