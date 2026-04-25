export type PaymentLogMethod = 'CARD' | 'BANK_TRANSFER' | 'MANUAL' | 'OTHER';

export interface PaymentLog {
  id: string;
  organizationId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  method: PaymentLogMethod;
  reference: string | null;
  paidAt: Date;
  notes: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}
