import type { MessageKey } from '@/locales/messages';

export type FeatureKey =
  | 'dashboard'
  | 'assets'
  | 'inventory'
  | 'warranties'
  | 'support'
  | 'auditLogs'
  | 'maintenance'
  | 'assetCheckouts'
  | 'assetNotes'
  | 'pos'
  | 'banna'
  | 'vehicleIntake';

// Order here drives the order of checkboxes in the package + org subscription
// forms. Grouping (Platform / Usool / Raseed / Haraka / Banna) lives in the
// UI layer (PackageForm) — it mirrors lib/nav/index.ts's module groups so
// package config matches what an org actually sees in the sidebar.
export const FEATURE_KEYS: FeatureKey[] = [
  'dashboard',
  'support',
  'auditLogs',
  'assets',
  'warranties',
  'maintenance',
  'assetCheckouts',
  'assetNotes',
  'inventory',
  'pos',
  'banna',
  'vehicleIntake',
];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  dashboard: 'Dashboard',
  assets: 'Assets',
  inventory: 'Inventory',
  warranties: 'Warranties',
  support: 'Support',
  auditLogs: 'Audit Logs',
  maintenance: 'Maintenance Records',
  assetCheckouts: 'Asset Checkouts',
  assetNotes: 'Asset Notes',
  pos: 'Point of Sale',
  banna: 'Banna (Custom Fields)',
  vehicleIntake: 'Vehicle Intake',
};

export const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  dashboard: 'Overview metrics and recent activity for the organization.',
  assets: 'Asset register: create, edit, retire, and import assets.',
  inventory: 'Track stocked items, reorder thresholds, and stock movements.',
  warranties: 'Track vendor warranties and expiry dates per asset.',
  support: 'In-app ticketing channel to the platform team.',
  auditLogs: 'View and export the immutable audit trail for the organization.',
  maintenance: 'Record service / repair / inspection events on assets.',
  assetCheckouts: 'Loan-out and return tracking for shared inventory.',
  assetNotes: 'Free-form notes attached to individual assets.',
  pos: 'Point of sale terminal for processing sales transactions.',
  banna: 'Custom fields for assets, inventory, and customers.',
  vehicleIntake: 'Plate-photo intake for Haraka Service Jobs.',
};

export interface PackageLimits {
  maxAssets: number;
  maxUsers: number;
  maxWarranties: number;
  maxSpaces: number;
  maxInventoryItems: number;
}

// Plan inclusions — support level / onboarding perks shown on pricing.
// Distinct from FEATURE_KEYS, which gate access to app modules.
export type InclusionKey =
  | 'csvExport'
  | 'emailSupport'
  | 'prioritySupport'
  | 'dedicatedOnboarding'
  | 'customSla';

export const INCLUSION_KEYS: InclusionKey[] = [
  'csvExport',
  'emailSupport',
  'prioritySupport',
  'dedicatedOnboarding',
  'customSla',
];

export const INCLUSION_LABELS: Record<InclusionKey, string> = {
  csvExport: 'CSV export',
  emailSupport: 'Email support',
  prioritySupport: 'Priority support',
  dedicatedOnboarding: 'Dedicated onboarding',
  customSla: 'Custom SLA',
};

export const INCLUSION_LABEL_KEYS: Record<InclusionKey, MessageKey> = {
  csvExport: 'inclusion.csvExport',
  emailSupport: 'inclusion.emailSupport',
  prioritySupport: 'inclusion.prioritySupport',
  dedicatedOnboarding: 'inclusion.dedicatedOnboarding',
  customSla: 'inclusion.customSla',
};

export interface PackagePricing {
  // Per-month price. null = not offered on this cycle (e.g. custom plans).
  monthlyPrice: number | null;
  // Total per-year price (already reflecting any annual discount).
  annualPrice: number | null;
  // ISO currency code, e.g. 'USD', 'JOD'.
  currency: string;
  // Custom / "contact sales" pricing (Enterprise). When true the displayed
  // monthlyPrice (if any) is treated as a "from" floor.
  isCustom: boolean;
}

// Extra Usool/Raseed capacity is sold in fixed blocks (block model: buy
// capacity, don't meter). These are the block sizes the prices below apply to.
export const USOOL_BLOCK_SIZE = 10;
export const RASEED_BLOCK_SIZE = 20;

// Monthly prices (in the package currency) for capacity bought beyond the
// plan's included allowances. Absent/0 = not separately priced. Add-ons are
// plan-agnostic (same price on any tier).
export interface AddOnPrices {
  usoolBlock?: number;   // per +USOOL_BLOCK_SIZE assets
  raseedBlock?: number;  // per +RASEED_BLOCK_SIZE items
  purchasesRequests?: number;
  // Per-module monthly price for a Haraka module active beyond the plan's
  // included slot count.
  harakaModules?: { pos?: number; services?: number; orders?: number; retainers?: number; appointments?: number };
  deliveryAgents?: number;
  warrantyCerts?: number;
  customization?: number;
  extraUser?: number;
  extraSpace?: number;
  vehicleIntake?: number; // plate-photo intake for Haraka Service Jobs
}

// Structured, per-module allowances for the new pricing model. Distinct from
// the legacy `limits` jsonb (kept for back-compat during the transition).
export interface PackageAllowances {
  usoolIncluded: number | null;              // included Usool assets (null = unset)
  raseedIncluded: number | null;             // included Raseed inventory items
  purchasesRequestsIncluded: boolean;        // Purchases & Requests bundled in
  harakaIncludedModuleSlots: number;         // free Haraka modules ("Choose N")
  deliveryAgentsIncluded: boolean;
  warrantyCertsIncluded: boolean;
  customizationIncluded: boolean;
  spacesIncluded: number | null;
  usersIncluded: number | null;
  vehicleIntakeIncluded: boolean;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  pricing: PackagePricing;
  // Free-trial length in days (e.g. 90 = 3-month trial). 0 = no trial.
  trialDays: number;
  // Display order on the pricing page / tier lists (ascending).
  sortOrder: number;
  limits: PackageLimits;
  features: Record<FeatureKey, boolean>;
  inclusions: Record<InclusionKey, boolean>;
  // Pricing-model fields (Phase 1+).
  allowances: PackageAllowances;
  addOnPrices: AddOnPrices;
  isCustom: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}
