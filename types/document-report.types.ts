import type { CustomFieldCondition, CustomFieldOption } from '@/types/banna.types';
import type { DocumentRef } from '@/types/document.types';

/** One field definition inside a report template's field_schema. Reuses
 *  Banna's condition/option shape so the same condition-eval.ts logic
 *  (lib/modules/banna/condition-eval.ts) works unchanged for reports. */
export interface ReportFieldDef {
  fieldKey: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multi_select' | 'date' | 'boolean' | 'user';
  label: string;
  labelAr?: string;
  required: boolean;
  options?: CustomFieldOption[];
  placeholder?: string;
  placeholderAr?: string;
  condition?: CustomFieldCondition | null;
  sortOrder: number;
}

export interface DocumentReportTemplate {
  id: string;
  organizationId: string;
  name: string;
  fieldSchema: ReportFieldDef[];
  schemaVersion: number;
  isActive: boolean;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

export type ReportEncounterType = 'appointment' | 'service_job' | 'order';

/** Stored on the report ('report-attachment' upload kind, private bucket) —
 *  same DocumentRef shape as warranty/purchase documents, re-signed on read
 *  via /api/storage/sign for the authenticated UI. The public share page
 *  signs URLs server-side directly (service-role, no client auth needed). */
export type ReportAttachment = DocumentRef;

export interface DocumentReportInstance {
  id: string;
  organizationId: string;
  templateId: string;
  templateName: string;
  customerId: string;
  encounterType: ReportEncounterType;
  encounterId: string;
  templateSchemaVersion: number;
  fieldSchemaSnapshot: ReportFieldDef[];
  fieldValues: Record<string, unknown>;
  attachments: ReportAttachment[];
  shareToken: string;
  /** true when templateSchemaVersion still matches the template's current
   *  schemaVersion — editing is only allowed while this holds. */
  isEditable: boolean;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

export type DocumentReportAuditAction = 'created' | 'edited' | 'viewed' | 'printed' | 'shared';

export interface DocumentReportAuditEntry {
  id: string;
  reportId: string;
  actorId: string | null;
  action: DocumentReportAuditAction;
  diff: Record<string, unknown> | null;
  createdAt: Date;
}
