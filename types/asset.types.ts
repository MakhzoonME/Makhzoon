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
  receiptUrl?: string;
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
