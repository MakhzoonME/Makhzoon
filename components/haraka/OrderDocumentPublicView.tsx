'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { OrderDocumentPreview, type DocumentType } from '@/components/haraka/OrderDocumentPreview';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import type { OrderDocumentConfig } from '@/lib/modules/haraka/orders/order-document-config';
import type { OrderDocumentOrder } from '@/lib/modules/haraka/orders/order-document-loader';

interface Props {
  type: DocumentType;
  order: OrderDocumentOrder;
  payments: Array<{ id: string; amount: number; paymentMethod: string | null; note: string | null }>;
  orgName: string;
  tagline: string;
  taxNumber: string;
  receiptConfig: ReceiptConfig;
  docConfig: OrderDocumentConfig;
  autoDownload?: boolean;
}

export function OrderDocumentPublicView({ type, order, payments, orgName, tagline, taxNumber, receiptConfig, docConfig, autoDownload }: Props) {
  useEffect(() => {
    if (autoDownload) {
      const id = setTimeout(() => window.print(), 400);
      return () => clearTimeout(id);
    }
  }, [autoDownload]);

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', gap: 16 }}>
      <div className="print:hidden" style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => window.print()}
          style={{ padding: '8px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
        >
          Download / Print PDF
        </button>
      </div>
      <div style={{ boxShadow: '0 4px 24px #0002', borderRadius: 12, overflow: 'hidden' }}>
        <OrderDocumentPreview
          type={type}
          order={order}
          payments={payments}
          orgName={orgName}
          tagline={tagline}
          taxNumber={taxNumber}
          receiptConfig={receiptConfig}
          docConfig={docConfig}
        />
      </div>
      <style>{`@media print { body * { visibility: hidden } #order-document, #order-document * { visibility: visible } #order-document { position: fixed; top: 0; left: 0; width: 100%; } }`}</style>
    </div>
  );
}
