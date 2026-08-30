export interface PosLineItem {
  inventoryItemId: string;
  inventoryItemName: string;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  /** Per-line discount amount (absolute, after percent resolution). */
  discountAmount: number;
  lineTotal: number;
}

export interface PosPayment {
  /** Org-configurable via the shared `payment_method` managed list. 'cash' and
   *  'card' stay code-significant (cash-drawer math, terminal integration)
   *  — anything else is a free label. */
  method: string;
  amount: number;
  reference: string | null;
  /** Last 4 digits of card, when method === 'card'. */
  cardLast4: string | null;
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
  discountApprovedBy: string | null;
  discountApprovedByName: string | null;
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
  tillName: string | null;
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

/** Org-configurable via the shared `payment_method` managed list — not a closed set. */
export type OrderPaymentMethod = string;

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

/** What a staff member can be assigned to. Multi-valued — one technician can
 *  both run field service jobs and take appointments. */
export type StaffCapability = 'delivery' | 'service_job' | 'appointment_provider';

export const STAFF_CAPABILITIES: StaffCapability[] = [
  'delivery',
  'service_job',
  'appointment_provider',
];

/** A person in the org's staff directory. Deliberately NOT tied to an auth
 *  account — most drivers and technicians never log in. */
export interface HarakaStaff {
  id: string;
  organizationId: string;
  name: string;
  phone: string | null;
  notes: string | null;
  capabilities: StaffCapability[];
  isActive: boolean;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

/** @deprecated `haraka_delivery_agents` became `haraka_staff` in migration
 *  0067. Kept so existing delivery call sites compile unchanged — prefer
 *  HarakaStaff in new code. */
export type HarakaDeliveryAgent = HarakaStaff;

/** One recurring weekly working block for an appointment provider. Several
 *  rows may share a dayOfWeek (split shifts). */
export interface HarakaStaffAvailability {
  id: string;
  organizationId: string;
  staffId: string;
  /** 0 = Sunday … 6 = Saturday, matching JS Date#getDay. */
  dayOfWeek: number;
  /** 'HH:mm', read in the organization's timezone. */
  startTime: string;
  endTime: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A single date overriding the weekly pattern. Both times null = day off;
 *  both set = different hours for that date. */
export interface HarakaStaffAvailabilityException {
  id: string;
  organizationId: string;
  staffId: string;
  /** 'YYYY-MM-DD'. */
  exceptionDate: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// A delivery agent assigned to a service job, with their current open-job
// load at the time of the query (used to render/verify balanced routing).
export interface ServiceJobAgentAssignment {
  agentId: string;
  agentName: string;
  role: 'primary' | 'helper';
  assignedAt: Date;
}

// The asset being serviced (car-care vertical, behind the 'vehicleIntake'
// feature flag). Kept separate from customer custom fields so it's directly
// queryable by plate number and reusable for other asset types later.
export interface HarakaServiceVehicle {
  id: string;
  organizationId: string;
  customerId: string | null;
  plateNumber: string;
  make: string | null;
  model: string | null;
  color: string | null;
  notes: string | null;
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

/**
 * QR fields here mirror `DocumentQrConfig` from lib/qr.ts (same
 * qrSource/qrCaption/qrPositionA4/qrPositionThermal shape, so
 * resolveDocumentQr/DocumentQrCard work unmodified) but qrTarget is always
 * 'self' — a warranty cert has no "custom link"/"uploaded file" concept, so
 * that field isn't stored here at all.
 */
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
  qrSource: 'none' | 'link';
  qrCaption: string;
  qrPositionA4: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  qrPositionThermal: 'top' | 'bottom';
  language: 'en' | 'ar' | 'both';
  template: string;
  accentColor: string;
}

// ── Haraka Service Jobs ───────────────────────────────────────────────────

export type ServiceJobStatus = 'new' | 'confirmed' | 'in_progress' | 'done' | 'cancelled';

export interface ServiceLine {
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
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
  vehicleId: string | null;
  /** Enriched by ServiceJobsRepository.list() only — plate of the linked vehicle, if any. */
  vehiclePlateNumber?: string | null;
  /** Enriched by ServiceJobsRepository.list() only — names of assigned delivery agents. */
  assignedAgentNames?: string[];
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

// ── Services (standalone catalog, independent of Raseed stock items) ───

export interface HarakaService {
  id: string;
  organizationId: string;
  spaceId: string | null;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  active: boolean;
  /** Nullable — only appointment-bookable services need one. Required by the
   *  zod schema whenever appointmentBookable is true. */
  durationMinutes: number | null;
  /** Gates whether this service shows up in the Appointments picker. Does not
   *  restrict its use in Service Jobs or on the register. */
  appointmentBookable: boolean;
  createdAt: Date;
  createdBy: string | null;
  createdByEmail: string | null;
  createdByName: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  updatedByEmail: string | null;
  updatedByName: string | null;
}

// ── Haraka Appointments ───────────────────────────────────────────────────

// Org-configurable via the `appointment_status` managed list — see
// lib/db/managed-lists.ts. 'scheduled' | 'confirmed' | 'completed' |
// 'cancelled' | 'no_show' are the platform defaults, not a closed set:
// orgs can add, rename, or disable statuses. Whether a given status
// triggers invoicing, blocks the calendar slot, or is terminal is looked
// up per-org at runtime (resolveListItemForOrg), not inferred from the code.
export type AppointmentStatus = string;

export interface HarakaAppointment {
  id: string;
  organizationId: string;
  spaceId: string | null;
  appointmentNumber: string;
  invoiceNumber: string | null;

  customerId: string | null;
  customerName: string;
  customerPhone: string | null;

  serviceId: string;
  /** Null when booked without a provider — orgs without the Workers add-on. */
  staffId: string | null;
  /** Enriched by AppointmentsRepository reads — not a stored column. */
  serviceName?: string | null;
  staffName?: string | null;

  scheduledAt: Date;
  /** Snapshot of haraka_services.duration_minutes at booking time. */
  durationMinutes: number;
  /** Snapshot of the catalog price at booking time. */
  price: number;
  /** Flat amount subtracted from price before tax, same convention as Orders/Service Jobs. */
  discountAmount: number;

  status: AppointmentStatus;
  taxAmount: number;
  total: number;
  paymentStatus: OrderPaymentStatus;
  amountPaid: number;

  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

export interface HarakaAppointmentPayment {
  id: string;
  appointmentId: string;
  organizationId: string;
  amount: number;
  paymentMethod: string | null;
  note: string | null;
  paidAt: Date;
  createdAt: Date;
  createdBy: string | null;
}

/** A Service Job line that references the catalog by FK, with price
 *  snapshotted at the time the line was added (migration 0068). */
export interface HarakaServiceJobItem {
  id: string;
  organizationId: string;
  jobId: string;
  serviceId: string;
  /** Enriched on read from the catalog — not a stored column. */
  serviceName?: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  createdAt: Date;
  createdBy: string | null;
}
