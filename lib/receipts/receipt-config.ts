import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';

/* Client-safe default receipt config. Kept free of server-only imports so it
   can be used from both client components (register, settings) and the
   server-side public-receipt loaders. */
export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  template: 'thermal-58',
  showLogo: true,
  showTaxNumber: true,
  showCashier: true,
  showFawtaraQr: true,
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
};
