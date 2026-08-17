// REFUNDED = paid, then refunded (full or partial). VOID = a PENDING invoice
// killed by cancelling its subscription before payment — keeps
// grace-enforcement from acting on a cancelled org's leftover invoice.
export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'READ_ONLY_TRIGGERED' | 'REFUNDED' | 'VOID';

export type InvoicePaymentMethod = 'CASH' | 'CHEQUE' | 'BANK_TRANSFER';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  subscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  foundingCohortDiscount: number;
  total: number;
  currency: string;
  dueDate: Date;
  graceDeadline: Date;
  status: InvoiceStatus;
  paymentMethod: InvoicePaymentMethod | null;
  paidAt: Date | null;
  markedPaidBy: string | null;
  refundedAt: Date | null;
  refundedBy: string | null;
  refundAmount: number | null;
  refundReason: string | null;
  createdAt: Date;
}
