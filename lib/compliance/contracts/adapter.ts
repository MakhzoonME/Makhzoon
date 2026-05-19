/**
 * The contract every country adapter must implement. Adapters are pure
 * functions over the CanonicalInvoice — they don't mutate POS state.
 *
 * Validation: cheap, synchronous. Surfaces problems early so the queue worker
 * doesn't waste a network round-trip on an invoice the gov API would reject.
 *
 * Transform: produce the gov payload but never call out. Submission is a
 * separate step so we can dry-run, snapshot, and audit the payload.
 *
 * Submit: the only async, side-effecting step. Returns success metadata or
 * throws an AdapterSubmissionError the queue layer can classify (retryable
 * vs. terminal).
 */

import type { CanonicalInvoice } from './canonical-invoice'

export interface ValidationResult {
  ok: boolean
  errors: Array<{ field: string; code: string; message: string }>
}

/** Opaque government-format payload. Each adapter defines its own shape. */
export interface GovernmentPayload {
  countryCode: string
  formatVersion: string
  payload: unknown
}

export interface SubmissionResult {
  externalReference: string
  externalInvoiceNumber: string | null
  acceptedAt: string
  qrPayload: string | null
  signature: string | null
  raw: unknown
}

export interface QRResult {
  payload: string
  encoding: 'TLV' | 'JSON' | 'URL' | 'OTHER'
}

export interface SignatureResult {
  algorithm: string
  signature: string
  certificateRef: string | null
}

export class AdapterSubmissionError extends Error {
  readonly code: string
  readonly retryable: boolean
  readonly details: unknown
  constructor(opts: { code: string; message: string; retryable?: boolean; details?: unknown }) {
    super(opts.message)
    this.code = opts.code
    this.retryable = opts.retryable ?? false
    this.details = opts.details
  }
}

export interface AdapterCapabilities {
  /** Country code this adapter serves (JO, SA, EG, …). */
  countryCode: string
  /** Human label for ops dashboards. */
  label: string
  /** Canonical schema versions accepted. */
  acceptedSchemaVersions: string[]
  /** Whether the adapter can generate a QR payload locally (no submit). */
  qrLocal: boolean
  /** Whether the adapter requires a digital signature step. */
  requiresSignature: boolean
}

export interface ComplianceAdapter {
  readonly capabilities: AdapterCapabilities
  validate(invoice: CanonicalInvoice): ValidationResult
  transform(invoice: CanonicalInvoice): GovernmentPayload
  submit(payload: GovernmentPayload, signal?: AbortSignal): Promise<SubmissionResult>
  generateQRCode(invoice: CanonicalInvoice): QRResult
  generateSignature(invoice: CanonicalInvoice): SignatureResult
}
