/**
 * Compliance-domain event contracts. The POS emits BUSINESS facts (sales,
 * refunds, voids). The compliance layer subscribes to these, transforms them
 * into CanonicalInvoice values, and enqueues submissions.
 *
 * NOT WIRED YET. These types only document the contract — there are no
 * consumers and no dispatcher. The existing `lib/platform/events/event-bus`
 * is unaware of these and continues to operate unchanged.
 */

export type ComplianceEventName =
  | 'pos.invoice.created'
  | 'pos.invoice.refunded'
  | 'pos.invoice.voided'
  | 'pos.invoice.credit_note_issued'
  | 'pos.branch.opened'
  | 'pos.register.activated'

export interface ComplianceEventEnvelope<TPayload = unknown> {
  eventId: string
  eventName: ComplianceEventName
  eventTime: string
  tenantId: string
  branchId: string | null
  countryCode: string
  payload: TPayload
  /** Schema version of the payload — bumped on breaking changes. */
  payloadVersion: string
}

export interface InvoiceCreatedPayload {
  invoiceId: string
  receiptNumber: string
  total: number
  currency: string
  itemCount: number
}

export interface InvoiceRefundedPayload {
  invoiceId: string
  parentInvoiceId: string
  refundTotal: number
  currency: string
  reason: string | null
}

export interface InvoiceVoidedPayload {
  invoiceId: string
  voidedBy: string
  voidedAt: string
}
