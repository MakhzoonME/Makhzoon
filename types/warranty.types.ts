import { DocumentRef } from './document.types';

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
  /** Warranty papers (private warranty-documents bucket). */
  documents?: DocumentRef[];
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}
