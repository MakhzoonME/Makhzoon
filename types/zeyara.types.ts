// Zeyara (زيارة) — the clinic vertical's own types.
//
// Only the CLINICAL layer lives here. Bookings, catalog, patients, and
// providers are the shared Haraka engine (see types/pos.types.ts) reached
// through the Zeyara vertical — they are not re-declared.
// See docs/plans/2026-08-26-zeyara-clinic-vertical-design.md §5.

/** One clinical record, pinned to exactly one appointment. */
export interface ZeyaraVisit {
  id: string;
  organizationId: string;
  spaceId: string | null;

  /** VST-NNNNNN — per org, per space. */
  visitNumber: string;
  appointmentId: string;

  customerId: string | null;
  /** Snapshotted so the visit stays attributable if the patient row detaches. */
  patientName: string;
  providerId: string | null;
  providerName: string | null;

  visitDate: Date;

  chiefComplaint: string | null;
  findings: string | null;
  diagnosis: string | null;
  treatmentPlan: string | null;

  /** Drives the follow-ups queue and the reminder sweep. */
  followUpDue: string | null;

  createdAt: Date;
  createdBy: string | null;
  createdByName: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  updatedByName: string | null;

  /** Enriched on read, not stored columns. */
  appointmentNumber?: string | null;
}

/**
 * Append-only clinical note. There is no update path by design — a correction
 * is a new note, so the record of what was believed when stays intact.
 */
export interface ZeyaraVisitNote {
  id: string;
  visitId: string;
  organizationId: string;
  body: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: Date;
}

/** A file attached to a clinical record. Stored private; read via signed URL. */
export interface ZeyaraVisitAttachment {
  id: string;
  visitId: string;
  organizationId: string;
  bucket: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedBy: string | null;
  uploadedByName: string | null;
  createdAt: Date;
  /** Short-lived signed URL, minted on read — never persisted. */
  url?: string;
}

/** A patient due back, for the follow-ups queue. */
export interface ZeyaraFollowUp {
  visitId: string;
  visitNumber: string;
  customerId: string | null;
  patientName: string;
  providerName: string | null;
  followUpDue: string;
  /** Negative = overdue. */
  daysUntilDue: number;
  lastVisitDate: Date;
}
