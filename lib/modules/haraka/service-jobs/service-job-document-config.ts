import { DEFAULT_DOCUMENT_QR, type DocumentQrConfig } from '@/lib/qr';

/** Config for Haraka service job invoices — stored in
 *  organization_configs.service_job_document_config (JSONB). */
export interface ServiceJobDocumentConfig extends DocumentQrConfig {
  invoiceTitle: string;
  showServiceType: boolean;
  showStaffMember: boolean;
  showServiceAddress: boolean;
  termsText: string;
  thankYouText: string;
}

export const DEFAULT_SERVICE_JOB_DOCUMENT_CONFIG: ServiceJobDocumentConfig = {
  invoiceTitle:       'SERVICE INVOICE',
  showServiceType:    true,
  showStaffMember:    true,
  showServiceAddress: true,
  termsText:          '',
  thankYouText:       'Thank you for your business!',
  ...DEFAULT_DOCUMENT_QR,
}
