export type StockStatus = 'ok' | 'low' | 'out';
export type InventoryUnit = 'each' | 'box' | 'pack' | 'pair' | 'roll' | 'liter' | 'kg' | 'meter' | 'sheet' | 'set';
export type TransactionType = 'in' | 'out' | 'adjustment';

import { DocumentRef } from './document.types';

export interface InventoryItem {
  id: string;
  organizationId: string;
  name: string;
  category: string;
  sku?: string;
  unit: InventoryUnit;
  quantityOnHand: number;
  minimumThreshold: number;
  reorderQuantity?: number;
  location?: string;
  supplier?: string;
  unitCost?: number;
  notes?: string;
  stockStatus: StockStatus;
  posEnabled?: boolean;
  barcode?: string | null;
  taxRateId?: string | null;
  posPrice?: number | null;
  expiryDate?: Date | null;
  /** Purchase receipts/invoices (private inventory-receipts bucket). */
  documents?: DocumentRef[];
  createdAt: Date;
  createdBy: string;
  createdByEmail?: string;
  createdByName?: string;
  updatedAt: Date;
  updatedBy: string;
  updatedByEmail?: string;
  updatedByName?: string;
}

export interface InventoryTransaction {
  id: string;
  organizationId: string;
  itemId: string;
  itemName: string;
  type: TransactionType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  note?: string;
  performedAt: Date;
  performedBy: string;
  performedByEmail?: string;
  performedByName?: string;
  performedByRole?: string;
}
