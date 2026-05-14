export interface Warranty {
  id: string;
  organizationId: string;
  assetId?: string;
  assetName?: string;
  inventoryItemId?: string;
  inventoryItemName?: string;
  vendor: string;
  startDate: Date;
  endDate: Date;
  reminder: boolean;
  notes?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}
