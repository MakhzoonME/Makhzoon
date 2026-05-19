/**
 * Compliance domain — dormant scaffolding for future country-specific tax /
 * e-invoicing integrations (JoFotara, ZATCA, ETA, PEPPOL, …).
 *
 * Architectural rules — see CLAUDE.md and the originating brief:
 *  - Country logic ONLY lives inside adapters (`adapters/<country>/`).
 *  - Core POS code MUST NOT import from this folder yet — existing Fawtara
 *    behaviour continues to flow through `lib/modules/haraka/fawtara/*`.
 *  - All feature flags default to false. Reading a flag is side-effect-free.
 *  - Compliance failures must NEVER block checkout — every consumer of this
 *    folder is expected to fire-and-forget or queue async.
 */

export * from './feature-flags'
export * from './country-config'
export type {
  CanonicalInvoice,
  InvoiceLine,
  InvoiceParty,
  InvoiceTaxBreakdown,
  InvoiceTotals,
  InvoiceReferences,
  InvoiceType,
  PartyAddress,
} from './contracts/canonical-invoice'
export { CANONICAL_INVOICE_SCHEMA_VERSION } from './contracts/canonical-invoice'
export type {
  ComplianceAdapter,
  AdapterCapabilities,
  GovernmentPayload,
  SubmissionResult,
  QRResult,
  SignatureResult,
  ValidationResult,
} from './contracts/adapter'
export { AdapterSubmissionError } from './contracts/adapter'
export {
  registerComplianceAdapter,
  resolveComplianceAdapter,
  listRegisteredAdapters,
} from './adapters/registry'
export type {
  ComplianceEventEnvelope,
  ComplianceEventName,
  InvoiceCreatedPayload,
  InvoiceRefundedPayload,
  InvoiceVoidedPayload,
} from './events/types'
export type {
  ComplianceJob,
  ComplianceQueueDriver,
  ComplianceQueueName,
  InvoiceSubmissionJobBody,
  JobStatus,
} from './queues/types'
export type {
  ComplianceCollectionKey,
  ComplianceEventRecord,
  CompliancePayloadRecord,
  ComplianceSubmissionRecord,
  ComplianceFailureRecord,
} from './storage/types'
export { COMPLIANCE_COLLECTIONS } from './storage/types'
export type { QRProvider } from './qr'
export type { SignatureProvider } from './signatures'
