export interface ConfigStatus {
  id: string;
  label: string;
  color: string;
}

export interface ConfigLocation {
  id: string;
  name: string;
}

export interface ConfigCategory {
  id: string;
  name: string;
}

export type ConfigSection = 'statuses' | 'locations' | 'categories';

export interface OrganizationConfig {
  organizationId: string;
  assetStatuses: ConfigStatus[];
  locations: ConfigLocation[];
  categories: ConfigCategory[];
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export const DEFAULT_ASSET_STATUSES: ConfigStatus[] = [
  { id: 'active', label: 'Active', color: '#22c55e' },
  { id: 'inactive', label: 'Inactive', color: '#9ca3af' },
];

export const DEFAULT_CATEGORIES: ConfigCategory[] = [
  { id: 'devices', name: 'Devices' },
  { id: 'hardware', name: 'Hardware' },
  { id: 'furniture', name: 'Furniture' },
  { id: 'software', name: 'Software' },
];

export const DEFAULT_LOCATIONS: ConfigLocation[] = [];
