/**
 * Storage shapes for the compliance audit trail. The collections listed in
 * COMPLIANCE_COLLECTIONS are NOT created or written to by any code today.
 * Once the queue+adapter pipeline goes live, every step (transform / submit /
 * response / failure / retry) gets a row in one of these for forensics.
 *
 * Centralising the names here keeps Firestore rules and migrations in sync
 * with the application.
 */

export const COMPLIANCE_COLLECTIONS = {
  events: 'complianceEvents',
  payloads: 'compliancePayloads',
  submissions: 'complianceSubmissions',
  responses: 'complianceResponses',
  failures: 'complianceFailures',
  retries: 'complianceRetries',
  auditLogs: 'complianceAuditLogs',
} as const

export type ComplianceCollectionKey = keyof typeof COMPLIANCE_COLLECTIONS

export interface ComplianceEventRecord {
  id: string
  tenantId: string
  branchId: string | null
  countryCode: string
  eventName: string
  payloadVersion: string
  payload: unknown
  createdAt: string
}

export interface CompliancePayloadRecord {
  id: string
  tenantId: string
  invoiceId: string
  countryCode: string
  formatVersion: string
  payload: unknown
  /** SHA-256 of the canonical payload — used to detect duplicates. */
  contentHash: string
  createdAt: string
}

export interface ComplianceSubmissionRecord {
  id: string
  tenantId: string
  invoiceId: string
  countryCode: string
  /** Adapter-assigned external reference (e.g. Fawtara UUID). */
  externalReference: string | null
  status: 'pending' | 'submitted' | 'failed' | 'partial'
  attempts: number
  submittedAt: string | null
  acceptedAt: string | null
  raw: unknown
}

export interface ComplianceFailureRecord {
  id: string
  tenantId: string
  invoiceId: string
  countryCode: string
  errorCode: string
  errorMessage: string
  retryable: boolean
  createdAt: string
}
