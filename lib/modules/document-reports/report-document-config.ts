import { DEFAULT_DOCUMENT_QR, type DocumentQrConfig } from '@/lib/qr';

/** Org-wide appearance for generated reports (the public /r/:org/reports/:token
 *  page) — stored in organization_configs.report_document_config (JSONB).
 *  qrTarget is always 'self' here (enforced in the settings UI via
 *  DocumentQrCard's lockTarget) — a report has no "physical original" a
 *  custom link/uploaded file makes sense for. */
export interface ReportDocumentConfig extends DocumentQrConfig {
  showLogo: boolean;
}

export const DEFAULT_REPORT_DOCUMENT_CONFIG: ReportDocumentConfig = {
  showLogo: true,
  ...DEFAULT_DOCUMENT_QR,
};
