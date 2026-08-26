/** Config for Haraka order invoices/receipts — stored in
 *  organization_configs.order_document_config (JSONB). */
export interface OrderDocumentConfig {
  /** Shown at top of invoice. Default: "TAX INVOICE" */
  invoiceTitle: string;
  /** Shown at top of receipt. Default: "RECEIPT" */
  receiptTitle: string;
  /** Show delivery address block. */
  showDeliveryAddress: boolean;
  /** Show order channel (Phone, WhatsApp…). */
  showChannel: boolean;
  /** Show sales agent name. */
  showSalesAgent: boolean;
  /** Show delivery agent name. */
  showDeliveryAgent: boolean;
  /** Terms and conditions text (footer). */
  termsText: string;
  /** Custom note below totals. */
  thankYouText: string;
}

export const DEFAULT_ORDER_DOCUMENT_CONFIG: OrderDocumentConfig = {
  invoiceTitle:       'TAX INVOICE',
  receiptTitle:       'RECEIPT',
  showDeliveryAddress: true,
  showChannel:         true,
  showSalesAgent:      false,
  showDeliveryAgent:   false,
  termsText:           '',
  thankYouText:        'Thank you for your order!',
};
