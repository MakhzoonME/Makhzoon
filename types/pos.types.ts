export interface PosLineItem {
  inventoryItemId: string;
  inventoryItemName: string;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  unitPrice: number;
  /** Resolved snapshot of the tax rate applied to this line at sale time. */
  taxRateId: string | null;
  taxRate: number;
  taxAmount: number;
  /** Per-line discount amount (absolute, after percent resolution). */
  discountAmount: number;
  lineTotal: number;
}

export interface PosPayment {
  method: 'cash' | 'card' | 'other';
  amount: number;
  reference: string | null;
  /** Last 4 digits of card, when method === 'card'. */
  cardLast4: string | null;
}

export type FawtaraSubmissionStatus = 'pending' | 'submitted' | 'failed' | 'skipped';

export interface FawtaraSubmission {
  status: FawtaraSubmissionStatus;
  uuid: string | null;
  /** Raw payload string returned by Fawtara, to be encoded as QR on the receipt. */
  qrPayload: string | null;
  /** Sequential per-org invoice number required by Fawtara. */
  invoiceNumber: string | null;
  submittedAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  attempts: number;
}

export interface PosTransaction {
  id: string;
  organizationId: string;
  sessionId: string;
  locationId: string;
  cashierId: string;
  cashierName: string;
  customerId: string | null;
  customerName: string | null;
  items: PosLineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  payments: PosPayment[];
  /** Total cash given by customer minus total due (positive = cash change to return). */
  change: number;
  status: 'completed' | 'refunded' | 'voided';
  receiptNumber: string;
  offlineId: string;
  syncedAt: Date | null;
  parentTransactionId: string | null;
  fawtara: FawtaraSubmission | null;
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

/**
 * Tax rate stored at the organization level. Shared between Raseed (item default),
 * Purchases (cost lines), and Haraka (sale lines).
 */
export interface TaxRate {
  id: string;
  organizationId: string;
  name: string;
  /** Percentage as a decimal fraction, e.g. 0.16 for 16%. */
  rate: number;
  isDefault: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface PosCustomer {
  id: string;
  organizationId: string;
  name: string;
  phone: string | null;
  email: string | null;
  taxNumber: string | null;
  notes: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
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

// ── Haraka Orders ─────────────────────────────────────────────────────────

export type OrderChannel = 'phone' | 'whatsapp' | 'instagram' | 'facebook' | 'other' | string;

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'assigned'
  | 'in_transit'
  | 'ready_for_pickup'
  | 'delivered'
  | 'picked_up'
  | 'cancelled';

export type OrderFulfillmentType = 'delivery' | 'pickup';

export type OrderPaymentStatus = 'unpaid' | 'partial' | 'paid';

export type OrderPaymentMethod = 'cash_on_delivery' | 'bank_transfer' | 'card' | 'other';

export interface OrderDeliveryAddress {
  street?: string | null;
  area?: string | null;
  city?: string | null;
  notes?: string | null;
}

export interface OrderLineItem {
  inventoryItemId: string;
  inventoryItemName: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  lineTotal: number;
}

export interface HarakaOrder {
  id: string;
  organizationId: string;
  spaceId: string | null;
  orderNumber: string;
  channel: OrderChannel;
  status: OrderStatus;
  fulfillmentType: OrderFulfillmentType;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  deliveryAddress: OrderDeliveryAddress | null;
  items: OrderLineItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentStatus: OrderPaymentStatus;
  amountPaid: number;
  paymentMethod: OrderPaymentMethod | null;
  salesAgentId: string;
  salesAgentName: string;
  deliveryAgentId: string | null;
  deliveryAgentMemberId: string | null;
  deliveryAgentName: string | null;
  notes: string | null;
  scheduledAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

export interface HarakaDeliveryAgent {
  id: string;
  organizationId: string;
  name: string;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}
