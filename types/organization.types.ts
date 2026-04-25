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

export interface Organization {
  id: string;
  name: string;
  subdomain: string;
  contactEmail: string;
  description: string | null;
  category: OrgCategory | null;
  packageDetails?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}
