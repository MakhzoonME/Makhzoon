export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'READ_ONLY_TRIGGERED';

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
  createdAt: Date;
}
