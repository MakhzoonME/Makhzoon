/**
 * Country-neutral invoice model. Adapters consume this; the POS produces it.
 * Never embed government-specific schema fields here — adapters are
 * responsible for the country-format transformation.
 *
 * Versioning: the `schemaVersion` constant is bumped on breaking changes.
 * Adapters declare which versions they accept (see ComplianceAdapter).
 */

export const CANONICAL_INVOICE_SCHEMA_VERSION = 'v1' as const

export type InvoiceType = 'SALE' | 'REFUND' | 'CREDIT_NOTE' | 'DEBIT_NOTE'

export interface PartyAddress {
  line1: string | null
  line2: string | null
  city: string | null
  region: string | null
  country: string | null
  postalCode: string | null
}

export interface InvoiceParty {
  name: string
  taxNumber: string | null
  registrationNumber: string | null
  email: string | null
  phone: string | null
  address: PartyAddress | null
}

export interface InvoiceLine {
  /** Stable item identifier in the source system (inventoryItemId, sku, etc). */
  itemRef: string
  description: string
  /** ISO 4217 currency code; should equal invoice.currency. */
  currency: string
  quantity: number
  unitPrice: number
  /** Pre-tax line discount as an absolute amount. */
  discountAmount: number
  /** Decimal fraction (0.16 == 16%). */
  taxRate: number
  /** Optional explicit tax category (e.g. 'standard', 'zero', 'exempt'). */
  taxCategory: string | null
  /** Convenience pre-computed values; adapters may recompute if needed. */
  subtotalBeforeTax: number
  taxAmount: number
  lineTotal: number
}

export interface InvoiceTaxBreakdown {
  taxCategory: string
  taxRate: number
  taxable: number
  taxAmount: number
}

export interface InvoiceTotals {
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  paid: number
  change: number
}

export interface InvoiceReferences {
  /** For refunds/credit notes — the canonical id of the original invoice. */
  originalInvoiceId: string | null
  /** External reference assigned by a tax authority (Fawtara UUID, ZATCA UUID, etc). */
  externalReference: string | null
  /** Caller-provided idempotency key. Same key → same submission. */
  idempotencyKey: string | null
}

export interface CanonicalInvoice {
  schemaVersion: typeof CANONICAL_INVOICE_SCHEMA_VERSION
  invoiceId: string
  invoiceType: InvoiceType
  issueDate: string
  tenantId: string
  branchId: string | null
  /** ISO 3166-1 alpha-2 country code (JO, SA, EG, AE…). */
  countryCode: string
  currency: string
  seller: InvoiceParty
  buyer: InvoiceParty | null
  lines: InvoiceLine[]
  taxes: InvoiceTaxBreakdown[]
  totals: InvoiceTotals
  references: InvoiceReferences
  /** Free-form metadata bag. Adapters may read country-specific hints here. */
  metadata: Record<string, unknown>
}
