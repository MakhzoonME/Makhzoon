// GRACE and READ_ONLY are added for the billing lifecycle (Phase 2). ACTIVE/
// EXPIRED/SUSPENDED remain valid — status is stored as free text.
export type SubscriptionStatus =
  | 'ACTIVE'
  | 'GRACE'
  | 'READ_ONLY'
  | 'EXPIRED'
  | 'SUSPENDED';

// The four selectable Haraka sub-modules ("Choose 1 / Choose 2").
export type HarakaModule = 'pos' | 'services' | 'orders' | 'retainers';

export const HARAKA_MODULES: HarakaModule[] = ['pos', 'services', 'orders', 'retainers'];

export const HARAKA_MODULE_LABELS: Record<HarakaModule, string> = {
  pos: 'Point of Sale',
  services: 'Services',
  orders: 'Orders',
  retainers: 'Retainers',
};

// Purchased add-ons layered on top of the plan's included allowances.
export interface SubscriptionAddOns {
  deliveryAgents: boolean;
  warrantyCerts: boolean;
  customization: boolean;
  purchasesRequests: boolean;
  // Haraka modules active beyond the plan's included slot count — each billed
  // at the standalone add-on price.
  extraHarakaModules: HarakaModule[];
  extraUsers: number;
  extraSpaces: number;
}

export const EMPTY_ADD_ONS: SubscriptionAddOns = {
  deliveryAgents: false,
  warrantyCerts: false,
  customization: false,
  purchasesRequests: false,
  extraHarakaModules: [],
  extraUsers: 0,
  extraSpaces: 0,
};

// Per-org limit overrides; when a value is set it wins over the package's
// included allowance + purchased add-ons. Absent keys fall back to the plan.
export interface SubscriptionLimitOverrides {
  usool?: number | null;
  raseed?: number | null;
  users?: number | null;
  spaces?: number | null;
}

export interface FoundingCohort {
  isFoundingCohort: boolean;
  discountPercent: number;
  discountExpiresAt: Date | null;
}

export interface Subscription {
  id: string;
  organizationId: string;
  packageId: string | null;
  features: Record<string, boolean>;
  notes: string | null;
  packageDetails: Record<string, unknown>;
  startDate: Date;
  endDate: Date;
  status: SubscriptionStatus;
  // Pricing-model fields (Phase 1+).
  activeHarakaModules: HarakaModule[];
  activeAddOns: SubscriptionAddOns;
  limitOverrides: SubscriptionLimitOverrides;
  foundingCohort: FoundingCohort | null;
  billingAnchorDay: number | null;
  graceStartedAt: Date | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}
