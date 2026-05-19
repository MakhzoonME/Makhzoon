/**
 * Compliance queue contracts. The queues themselves are NOT instantiated —
 * these types only document the shape so future workers can be added without
 * refactoring callers.
 *
 * A real implementation will likely sit on top of Firestore or Pub/Sub; the
 * interface is intentionally minimal so either choice fits.
 */

import type { CanonicalInvoice } from '../contracts/canonical-invoice'
import type { GovernmentPayload, SubmissionResult } from '../contracts/adapter'

export type ComplianceQueueName =
  | 'invoice-submission'
  | 'invoice-validation'
  | 'invoice-retry'
  | 'qr-generation'
  | 'signature-generation'
  | 'compliance-sync'

export type JobStatus = 'pending' | 'in_flight' | 'succeeded' | 'failed' | 'dead_letter'

export interface ComplianceJob<TBody = unknown> {
  jobId: string
  tenantId: string
  countryCode: string
  queue: ComplianceQueueName
  body: TBody
  status: JobStatus
  attempts: number
  /** ISO 8601 timestamp. */
  nextRunAt: string | null
  /** ISO 8601 timestamps for observability. */
  createdAt: string
  updatedAt: string
  lastError: { code: string; message: string } | null
}

export interface InvoiceSubmissionJobBody {
  invoice: CanonicalInvoice
  /** Output of the adapter's transform() — cached for retries. */
  payload: GovernmentPayload | null
  /** Latest result if submission already happened (idempotency). */
  result: SubmissionResult | null
}

/**
 * Contract for a queue driver — Firestore, Pub/Sub, in-memory, etc. Not
 * implemented anywhere yet; consumers should not import this until a driver
 * is added.
 */
export interface ComplianceQueueDriver {
  enqueue<TBody>(queue: ComplianceQueueName, body: TBody, opts?: { delaySeconds?: number }): Promise<ComplianceJob<TBody>>
  ack(jobId: string, result?: unknown): Promise<void>
  fail(jobId: string, error: { code: string; message: string; retryable: boolean }): Promise<void>
}
