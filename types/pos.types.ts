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
  invoiceNumber: string | null;
  deliveryToken: string | null;
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

// ── Haraka Warranty Certificates ─────────────────────────────────────────

export type WarrantyCertSourceType = 'order' | 'pos_transaction';

export interface WarrantyCertItem {
  inventoryItemId: string;
  inventoryItemName: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
}

export interface HarakaWarrantyCert {
  id: string;
  organizationId: string;
  spaceId: string | null;
  warrantyNumber: string;
  sourceType: WarrantyCertSourceType;
  orderId: string | null;
  transactionId: string | null;
  customerName: string;
  customerPhone: string | null;
  items: WarrantyCertItem[];
  warrantyStartDate: string; // ISO date
  warrantyEndDate: string;   // ISO date
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

export interface HarakaWarrantyConfig {
  organizationId: string;
  defaultDurationDays: number;
  termsText: string | null;
  termsTextAr: string | null;
  headerText: string | null;
  headerTextAr: string | null;
  footerText: string | null;
  footerTextAr: string | null;
  showLogo: boolean;
  showQr: boolean;
  language: 'en' | 'ar' | 'both';
  template: string;
  accentColor: string;
}

// ── Haraka Card Terminal ──────────────────────────────────────────────────

export type CardTerminalMode = 'display' | 'local_bridge' | 'cloud' | 'webhook';
export type CardTerminalProvider = 'sumup' | 'square' | 'paymob' | 'custom';
export type CardChargeStatus = 'pending' | 'approved' | 'declined' | 'timeout' | 'cancelled';

export interface HarakaCardTerminalConfig {
  organizationId: string;
  enabled: boolean;
  mode: CardTerminalMode;
  bridgeUrl: string | null;
  provider: CardTerminalProvider | null;
  /** api_key_enc is never returned to the client — only a boolean `apiKeySet` */
  apiKeySet: boolean;
  terminalId: string | null;
  /** webhook_secret is never returned to the client */
  webhookSecretSet: boolean;
  currency: string;
  timeoutSeconds: number;
}

export interface HarakaCardCharge {
  id: string;
  organizationId: string;
  reference: string;
  amount: number;
  currency: string;
  status: CardChargeStatus;
  providerRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Haraka Service Jobs ───────────────────────────────────────────────────

export type ServiceJobStatus = 'new' | 'confirmed' | 'in_progress' | 'done' | 'cancelled';

export interface ServiceLine {
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  lineTotal: number;
}

export interface HarakaServiceJob {
  id: string;
  organizationId: string;
  spaceId: string | null;
  jobNumber: string;
  invoiceNumber: string | null;
  serviceType: string | null;
  status: ServiceJobStatus;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  staffMemberId: string | null;
  staffMemberName: string | null;
  items: ServiceLine[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentStatus: OrderPaymentStatus;
  amountPaid: number;
  paymentMethod: string | null;
  scheduledAt: Date | null;
  serviceAddress: OrderDeliveryAddress | null;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

// ── Haraka Reception Tickets ──────────────────────────────────────────────

export type ReceptionTicketStatus = 'open' | 'paid' | 'cancelled';

/** Summary of the ticket's linked service job, embedded in API responses so
 *  reception staff don't need service-jobs permissions to see their ticket. */
export interface ReceptionTicketJobSummary {
  id: string;
  jobNumber: string;
  status: ServiceJobStatus;
  paymentStatus: OrderPaymentStatus;
  total: number;
  items: ServiceLine[];
}

export interface HarakaReceptionTicket {
  id: string;
  organizationId: string;
  spaceId: string | null;
  ticketNumber: string;
  status: ReceptionTicketStatus;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  /** Vehicle plate number — third searchable customer identifier (garages etc.). */
  carPlate: string | null;
  /** Product lines (POS-enabled inventory items) — same shape as PosTransaction.items. */
  items: PosLineItem[];
  /** Linked service job carrying the ticket's service lines (one job per ticket). */
  serviceJobId: string | null;
  /** Populated by the API from the linked job (null when no services). */
  serviceJob?: ReceptionTicketJobSummary | null;
  productsSubtotal: number;
  productsDiscount: number;
  productsTax: number;
  productsTotal: number;
  servicesTotal: number;
  grandTotal: number;
  notes: string | null;
  posTransactionId: string | null;
  paidAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

// ── Haraka Retainers ──────────────────────────────────────────────────────

export type RetainerStatus = 'active' | 'paused' | 'cancelled' | 'expired';
export type BillingCycle = 'monthly' | 'quarterly' | 'annual';

export interface HarakaRetainer {
  id: string;
  organizationId: string;
  spaceId: string | null;
  retainerNumber: string;
  name: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  staffMemberId: string | null;
  staffMemberName: string | null;
  billingCycle: BillingCycle;
  amountPerCycle: number;
  taxRate: number;
  startDate: string;
  endDate: string | null;
  status: RetainerStatus;
  nextBillingDate: string | null;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

export interface HarakaRetainerInvoice {
  id: string;
  retainerId: string;
  organizationId: string;
  invoiceNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string | null;
  amount: number;
  taxAmount: number;
  total: number;
  paymentStatus: OrderPaymentStatus;
  amountPaid: number;
  paymentMethod: string | null;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
}
