export const ORG_CATEGORIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Education',
  'Government',
  'Non-Profit',
  'Other',
] as const;

export type OrgCategory = (typeof ORG_CATEGORIES)[number];

export type FawtaraMode = 'sandbox' | 'production';
export type FawtaraInvoiceType = 'income' | 'general';

/**
 * Per-organization Fawtara (Jordan ISTD e-invoicing) configuration.
 * Stored on the organization document. Secrets are never returned to the client.
 */
export interface FawtaraConfig {
  enabled: boolean;
  mode: FawtaraMode;
  taxpayerNumber: string | null;
  activityNumber: string | null;
  /** Sentinel only — actual secret stored server-side (encrypted). True means a secret is set. */
  hasClientCredentials: boolean;
  invoiceTypeDefault: FawtaraInvoiceType;
  vatRegistered: boolean;
}

export const DEFAULT_FAWTARA_CONFIG: FawtaraConfig = {
  enabled: false,
  mode: 'sandbox',
  taxpayerNumber: null,
  activityNumber: null,
  hasClientCredentials: false,
  invoiceTypeDefault: 'general',
  vatRegistered: false,
};

export interface Organization {
  id: string;
  name: string;
  subdomain: string;
  contactEmail: string;
  description: string | null;
  category: OrgCategory | null;
  packageDetails?: string;
  assignedMemberId: string | null;
  fawtara?: FawtaraConfig;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}
