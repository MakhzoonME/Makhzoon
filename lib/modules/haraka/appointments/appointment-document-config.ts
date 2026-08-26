/** Fixed copy for the appointment invoice document. No per-org customization
 *  table for this yet (unlike service jobs' ServiceJobDocumentConfig) —
 *  branding still comes from the shared receipt context (logo/address/phone/
 *  accent color). Deliberately not server-only: both the client-rendered
 *  preview and the server-side document loader import from here. */
export const APPOINTMENT_INVOICE_TITLE = 'APPOINTMENT INVOICE';
export const APPOINTMENT_INVOICE_THANK_YOU = 'Thank you for your business!';
