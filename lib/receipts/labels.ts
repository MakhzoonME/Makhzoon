/**
 * Shared receipt label dictionary (English + Arabic).
 *
 * Used by BOTH the HTML receipt templates (ReceiptPreview) and the thermal
 * ESC/POS / canvas builders so static wording never drifts between channels.
 *
 * A receipt always renders in a single concrete language ('en' | 'ar'); the
 * org-level 'both' setting is resolved to one of these by the caller
 * (preview toggle, public-page toggle, or cashier pick at print time).
 */

export type ReceiptLang = 'en' | 'ar';

export interface ReceiptLabels {
  salesReceipt: string;
  invoice: string;
  refund: string;
  receipt: string;     // "Receipt #1042"
  date: string;
  cashier: string;
  customer: string;
  item: string;
  description: string;
  qty: string;
  price: string;
  unit: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  change: string;
  cash: string;
  card: string;
  taxNo: string;       // short, thermal/compact
  taxReg: string;      // longer, A4
  thankYou: string;    // default footer fallback
  fawtaraPending: string;
  status: {
    completed: string;
    refunded: string;
    voided: string;
  };
}

const RECEIPT_LABELS: Record<ReceiptLang, ReceiptLabels> = {
  en: {
    salesReceipt: 'Sales Receipt',
    invoice: 'INVOICE',
    refund: 'REFUND',
    receipt: 'Receipt',
    date: 'Date',
    cashier: 'Cashier',
    customer: 'Customer',
    item: 'Item',
    description: 'Description',
    qty: 'Qty',
    price: 'Price',
    unit: 'Unit',
    subtotal: 'Subtotal',
    discount: 'Discount',
    tax: 'Tax',
    total: 'Total',
    change: 'Change',
    cash: 'Cash',
    card: 'Card',
    taxNo: 'Tax #',
    taxReg: 'Tax Reg. #',
    thankYou: 'Thank you for your purchase!',
    fawtaraPending: 'Fawtara: pending e-invoicing',
    status: { completed: 'Completed', refunded: 'Refunded', voided: 'Voided' },
  },
  ar: {
    salesReceipt: 'إيصال مبيعات',
    invoice: 'فاتورة',
    refund: 'مرتجع',
    receipt: 'إيصال',
    date: 'التاريخ',
    cashier: 'الكاشير',
    customer: 'العميل',
    item: 'الصنف',
    description: 'الوصف',
    qty: 'الكمية',
    price: 'السعر',
    unit: 'سعر الوحدة',
    subtotal: 'المجموع الفرعي',
    discount: 'الخصم',
    tax: 'الضريبة',
    total: 'الإجمالي',
    change: 'الباقي',
    cash: 'نقدي',
    card: 'بطاقة',
    taxNo: 'الرقم الضريبي',
    taxReg: 'رقم التسجيل الضريبي',
    thankYou: 'شكراً لتسوقكم معنا!',
    fawtaraPending: 'فوترة: قيد الإصدار الإلكتروني',
    status: { completed: 'مكتمل', refunded: 'مرتجع', voided: 'ملغى' },
  },
};

export function receiptLabels(lang: ReceiptLang): ReceiptLabels {
  return RECEIPT_LABELS[lang];
}

export function isRtl(lang: ReceiptLang): boolean {
  return lang === 'ar';
}

/**
 * Choose a free-text value for the target language, falling back to the other
 * language when the preferred one is empty (so a half-translated receipt still
 * shows content rather than a blank).
 */
export function pickText(lang: ReceiptLang, en: string | undefined, ar: string | undefined): string {
  const e = (en ?? '').trim();
  const a = (ar ?? '').trim();
  return lang === 'ar' ? (a || e) : (e || a);
}
