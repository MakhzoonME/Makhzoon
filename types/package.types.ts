export type FeatureKey =
  | 'warranties'
  | 'requests'
  | 'reports'
  | 'maintenance'
  | 'assetCheckouts'
  | 'assetNotes'
  | 'support';

export const FEATURE_KEYS: FeatureKey[] = [
  'warranties',
  'requests',
  'reports',
  'maintenance',
  'assetCheckouts',
  'assetNotes',
  'support',
];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  warranties: 'Warranties',
  requests: 'Requests',
  reports: 'Reports',
  maintenance: 'Maintenance Records',
  assetCheckouts: 'Asset Checkouts',
  assetNotes: 'Asset Notes',
  support: 'Support Tickets',
};

export const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  warranties: 'Track vendor warranties and expiry dates per asset.',
  requests: 'Allow staff to submit new-asset, retire, or extend requests.',
  reports: 'Visibility into utilisation, depreciation, and cost reports.',
  maintenance: 'Record service / repair / inspection events on assets.',
  assetCheckouts: 'Loan-out and return tracking for shared inventory.',
  assetNotes: 'Free-form notes attached to individual assets.',
  support: 'In-app ticketing channel to the platform team.',
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
