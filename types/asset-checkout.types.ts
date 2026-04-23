export interface AssetCheckout {
  id: string;
  organizationId: string;
  assetId: string;
  checkedOutTo: string;
  checkedOutBy: string;
  checkedOutByEmail: string;
  dueDate?: Date;
  notes?: string;
  checkedOutAt: Date;
  returnedAt?: Date;
  returnedBy?: string;
  returnedByEmail?: string;
}
