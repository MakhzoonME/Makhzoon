export type AssetStatus = 'Active' | 'Retired';

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
  updatedAt: Date;
  updatedBy: string;
}
