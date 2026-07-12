import type { MessageKey } from '@/locales/messages';

export type FeatureKey =
  | 'dashboard'
  | 'assets'
  | 'inventory'
  | 'warranties'
  | 'requests'
  | 'reports'
  | 'support'
  | 'auditLogs'
  | 'maintenance'
  | 'assetCheckouts'
  | 'assetNotes'
  | 'pos'
  | 'reception'
  | 'banna';

// Order here drives the order of checkboxes in the package + org subscription forms.
export const FEATURE_KEYS: FeatureKey[] = [
  'dashboard',
  'assets',
  'inventory',
  'warranties',
  'requests',
  'reports',
  'support',
  'auditLogs',
  'maintenance',
  'assetCheckouts',
  'assetNotes',
  'pos',
  'reception',
  'banna',
];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  dashboard: 'Dashboard',
  assets: 'Assets',
  inventory: 'Inventory',
  warranties: 'Warranties',
  requests: 'Requests',
  reports: 'Reports',
  support: 'Support',
  auditLogs: 'Audit Logs',
  maintenance: 'Maintenance Records',
  assetCheckouts: 'Asset Checkouts',
  assetNotes: 'Asset Notes',
  pos: 'Point of Sale',
  reception: 'Reception (front desk)',
  banna: 'Banna (Custom Fields)',
};

export const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  dashboard: 'Overview metrics and recent activity for the organization.',
  assets: 'Asset register: create, edit, retire, and import assets.',
  inventory: 'Track stocked items, reorder thresholds, and stock movements.',
  warranties: 'Track vendor warranties and expiry dates per asset.',
  requests: 'Allow staff to submit new-asset, retire, or extend requests.',
  reports: 'Visibility into utilisation, depreciation, and cost reports.',
  support: 'In-app ticketing channel to the platform team.',
  auditLogs: 'View and export the immutable audit trail for the organization.',
  maintenance: 'Record service / repair / inspection events on assets.',
  assetCheckouts: 'Loan-out and return tracking for shared inventory.',
  assetNotes: 'Free-form notes attached to individual assets.',
  pos: 'Point of sale terminal for processing sales transactions.',
  reception: 'Front-desk intake tickets handed off to the POS register for payment. Requires Point of Sale.',
  banna: 'Custom fields for assets, inventory, and requests.',
};

export interface PackageLimits {
  maxAssets: number;
  maxUsers: number;
  maxWarranties: number;
  maxRequests: number;
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
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}
