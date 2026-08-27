import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import type { ReceiptPrintText } from '@/lib/modules/haraka/printing/receipt-canvas';
import { DEFAULT_DOCUMENT_QR, resolveDocumentQr } from '@/lib/qr';

/* Client-safe default receipt config. Kept free of server-only imports so it
   can be used from both client components (register, settings) and the
   server-side public-receipt loaders. */
export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  template: 'thermal-58',
  showLogo: true,
  showTaxNumber: true,
  showCashier: true,
  showItemizedTax: true,
  showAddress: true,
  showPhone: true,
  showWebsite: false,
  footerText: 'Thank you for your purchase!',
  footerTextAr: '',
  accentColor: '#1d4ed8',
  logo: null,
  phone: '',
  address: '',
  addressAr: '',
  website: '',
  orgName: '',
  orgNameAr: '',
  language: 'en',
  copies: 1,
  // Extra blank lines on top of the mandatory blade clearance. 0 = just enough
  // paper for the cut to land below the footer; raise it for a longer tear-off.
  cutFeed: 0,
  // Off by default: existing orgs keep printing exactly the receipt they had.
  ...DEFAULT_DOCUMENT_QR,
};

/**
 * Printable dot width implied by the chosen template. The template — not the
 * paired device — is the source of truth here, so the preview and the paper
 * always agree (the settings page shows paper width as a read-only echo of it).
 */
export function paperWidthFor(template: ReceiptConfig['template']): 58 | 80 {
  return template === 'thermal-80' ? 80 : 58;
}

/**
 * Flatten the saved receipt config into the text bundle the raster renderer
 * takes. Shared by the register and the receipt-designer so the preview and
 * the printed bitmap are built from identical inputs.
 */
export function toPrintText(
  config: ReceiptConfig | undefined,
  extras: {
    orgName: string;
    tagline: string;
    taglineAr: string;
    taxNumber: string;
    /** Public URL of this receipt; drives the QR when qrSource is on. */
    documentUrl?: string | null;
    /** E-invoicing payload, when a compliance adapter produced one. */
    compliancePayload?: string | null;
  },
): ReceiptPrintText {
  const c = config ?? DEFAULT_RECEIPT_CONFIG;
  return {
    qr: resolveDocumentQr(c, {
      documentUrl: extras.documentUrl,
      compliancePayload: extras.compliancePayload,
    }),
    orgName: c.orgName?.trim() || extras.orgName,
    orgNameAr: c.orgNameAr ?? '',
    tagline: extras.tagline,
    taglineAr: extras.taglineAr,
    address: c.address ?? '',
    addressAr: c.addressAr ?? '',
    phone: c.phone ?? '',
    website: c.website ?? '',
    taxNumber: extras.taxNumber,
    footerText: c.footerText ?? '',
    footerTextAr: c.footerTextAr ?? '',
    logo: c.logo ?? null,
    showLogo: c.showLogo ?? true,
    showAddress: c.showAddress ?? true,
    showPhone: c.showPhone ?? true,
    showWebsite: c.showWebsite ?? false,
    showCashier: c.showCashier ?? true,
    showTaxNumber: c.showTaxNumber ?? true,
    showItemizedTax: c.showItemizedTax ?? true,
  };
}
