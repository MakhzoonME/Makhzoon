import { DocumentRef } from './document.types';

export type PurchaseStatus = 'draft' | 'received' | 'cancelled';

export interface PurchaseLine {
  /** Inventory item id. Optional only at draft time when an unknown barcode was scanned and the user hasn't resolved/created the item yet. */
  itemId: string | null;
  itemName: string;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  unitCost: number;
  taxRateId: string | null;
  taxAmount: number;
  lineTotal: number;
  notes: string | null;
}

export interface Purchase {
  id: string;
  organizationId: string;
  supplierName: string;
  supplierContact: string | null;
  invoiceNumber: string | null;
  invoiceDate: Date;
  receivedDate: Date | null;
  status: PurchaseStatus;
  lines: PurchaseLine[];
  subtotal: number;
  taxTotal: number;
  total: number;
  notes: string | null;
  /** Supplier invoices/receipts (private purchase-invoices bucket). */
  documents?: DocumentRef[];
  /** When true, receiving this purchase updates each item's last-cost on the InventoryItem. */
  updateItemUnitCost: boolean;
  createdAt: Date;
  createdBy: string;
  createdByEmail: string | null;
  createdByName: string | null;
  updatedAt: Date;
  updatedBy: string;
  updatedByEmail: string | null;
  updatedByName: string | null;
  receivedBy: string | null;
  receivedByName: string | null;
}
