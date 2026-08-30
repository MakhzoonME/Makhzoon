import { DEFAULT_DOCUMENT_QR, type DocumentQrConfig } from '@/lib/qr';

/** Fixed copy for the appointment invoice document. No per-org customization
 *  of the wording yet (unlike service jobs' ServiceJobDocumentConfig) —
 *  branding still comes from the shared receipt context (logo/address/phone/
 *  accent color). Deliberately not server-only: both the client-rendered
 *  preview and the server-side document loader import from here. */
export const APPOINTMENT_INVOICE_TITLE = 'APPOINTMENT INVOICE';
export const APPOINTMENT_INVOICE_THANK_YOU = 'Thank you for your business!';

/** Per-org appointment invoice settings — stored in
 *  organization_configs.appointment_document_config (JSONB).
 *
 *  QR + logo visibility only for now. The title/thank-you above stay
 *  constants until there is a reason to make them editable; this exists
 *  because the QR source and logo visibility are per-document-type choices
 *  and the appointment invoice is its own document. */
export interface AppointmentDocumentConfig extends DocumentQrConfig {
  /** Independent of the shared receipt config — see OrderDocumentConfig.showLogo. */
  showLogo: boolean;
}

export const DEFAULT_APPOINTMENT_DOCUMENT_CONFIG: AppointmentDocumentConfig = {
  showLogo: true,
  ...DEFAULT_DOCUMENT_QR,
};
