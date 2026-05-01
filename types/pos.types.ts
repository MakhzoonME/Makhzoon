export interface PosLineItem {
  inventoryItemId: string;
  inventoryItemName: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}

export interface PosPayment {
  method: 'cash' | 'card' | 'other';
  amount: number;
  reference: string | null;
}

export interface PosTransaction {
  id: string;
  organizationId: string;
  sessionId: string;
  locationId: string;
  cashierId: string;
  cashierName: string;
  items: PosLineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  payments: PosPayment[];
  status: 'completed' | 'refunded' | 'voided';
  receiptNumber: string;
  offlineId: string;
  syncedAt: Date | null;
  parentTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PosSession {
  id: string;
  organizationId: string;
  locationId: string;
  cashierId: string;
  cashierName: string;
  openedAt: Date;
  closedAt: Date | null;
  status: 'open' | 'closed';
  openingFloat: number;
  closingFloat: number | null;
  expectedFloat: number | null;
  discrepancy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PosTaxRate {
  id: string;
  name: string;
  rate: number;
}

export interface PosConfig {
  organizationId: string;
  taxRates: PosTaxRate[];
  defaultTaxRateId: string | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
  allowDiscounts: boolean;
  maxDiscountPercent: number;
  requireManagerOverride: boolean;
  currency: string;
  currencySymbol: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface PosReceiptCounter {
  organizationId: string;
  lastReceiptNumber: number;
}
