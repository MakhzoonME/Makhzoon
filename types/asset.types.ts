// Asset statuses are config-driven (managed list 'asset_status'); the platform
// defaults are Active/Inactive/Maintenance/Retired, but orgs/superadmin may add
// more, so this is an open string. Retire/checkout logic keys off 'Active'/'Retired'.
export type AssetStatus = string;

export interface Asset {
  id: string;
  organizationId: string;
  name: string;
  category: string;
  status: AssetStatus;
  serialNumber?: string;
  purchaseDate?: Date;
  purchaseCost?: number;
  assignedTo?: string;
  location?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
  createdByEmail?: string;
  createdByName?: string;
  createdByRole?: string;
  updatedAt: Date;
  updatedBy: string;
  updatedByEmail?: string;
  updatedByName?: string;
  updatedByRole?: string;
}
