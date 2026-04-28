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
  | 'assetNotes';

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
};

export interface PackageLimits {
  maxAssets: number;
  maxUsers: number;
  maxWarranties: number;
  maxRequests: number;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  limits: PackageLimits;
  features: Record<FeatureKey, boolean>;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}
