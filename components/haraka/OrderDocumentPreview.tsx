'use client';

import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import type { OrderDocumentConfig } from '@/lib/modules/haraka/orders/order-document-config';
import type { OrderDocumentOrder } from '@/lib/modules/haraka/orders/order-document-loader';

export type DocumentType = 'invoice' | 'receipt';

interface PaymentEntry {
  id: string;
  amount: number;
  paymentMethod: string | null;
  note: string | null;
}

interface Props {
  type: DocumentType;
  order: OrderDocumentOrder;
  payments: PaymentEntry[];
  orgName: string;
  tagline: string;
  taxNumber: string;
  receiptConfig: ReceiptConfig;
  docConfig: OrderDocumentConfig;
  currency?: string;
}

function fmt(n: number, currency = 'JOD') {
  return `${Number(n).toFixed(3)} ${currency}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function capFirst(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function OrderDocumentPreview({
  type, order, payments, orgName, tagline, taxNumber,
  receiptConfig, docConfig, currency = 'JOD',
}: Props) {
  const isReceipt = type === 'receipt';
  const title = isReceipt ? docConfig.receiptTitle : docConfig.invoiceTitle;
  const accent = receiptConfig.accentColor || '#1d4ed8';
  const docNumber = order.invoiceNumber ?? order.orderNumber;
  const remaining = order.total - order.amountPaid;

  return (
    <div
      id="order-document"
      style={{
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        background: '#fff',
        color: '#111',
        width: '210mm',
        minHeight: '297mm',
        padding: '14mm 16mm',
        boxSizing: 'border-box',
        fontSize: '10pt',
        lineHeight: 1.5,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8mm', borderBottom: `2px solid ${accent}`, paddingBottom: '6mm' }}>
        <div>
          {receiptConfig.showLogo && receiptConfig.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={receiptConfig.logo} alt="logo" style={{ height: 48, marginBottom: 8, objectFit: 'contain' }} />
          )}
          <div style={{ fontSize: '16pt', fontWeight: 700, color: '#111' }}>
            {receiptConfig.orgName || orgName}
          </div>
          {tagline && <div style={{ fontSize: '9pt', color: '#666', marginTop: 2 }}>{tagline}</div>}
          {receiptConfig.showAddress && receiptConfig.address && (
            <div style={{ fontSize: '9pt', color: '#666', marginTop: 4 }}>{receiptConfig.address}</div>
          )}
          {receiptConfig.showPhone && receiptConfig.phone && (
            <div style={{ fontSize: '9pt', color: '#666' }}>{receiptConfig.phone}</div>
          )}
          {receiptConfig.showTaxNumber && taxNumber && (
            <div style={{ fontSize: '9pt', color: '#666' }}>Tax No: {taxNumber}</div>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '22pt', fontWeight: 800, color: accent, letterSpacing: '-0.5px' }}>
            {title}
          </div>
          <div style={{ fontSize: '10pt', fontWeight: 600, color: '#444', marginTop: 4 }}>
            #{docNumber}
          </div>
          <div style={{ fontSize: '9pt', color: '#666', marginTop: 2 }}>
            Date: {fmtDate(order.createdAt)}
          </div>
          {isReceipt && (
            <div style={{ marginTop: 8, background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: 12, fontSize: '9pt', fontWeight: 700, display: 'inline-block' }}>
              ✓ PAID
            </div>
          )}
          {!isReceipt && remaining > 0.001 && (
            <div style={{ marginTop: 8, background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: 12, fontSize: '9pt', fontWeight: 700, display: 'inline-block' }}>
              BALANCE DUE: {fmt(remaining, currency)}
            </div>
          )}
        </div>
      </div>

      {/* Bill To + Order Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6mm', marginBottom: '6mm' }}>
        <div>
          <div style={{ fontSize: '8pt', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Bill To</div>
          <div style={{ fontWeight: 600, fontSize: '11pt' }}>{order.customerName}</div>
          {order.customerPhone && <div style={{ fontSize: '9pt', color: '#555' }}>{order.customerPhone}</div>}
          {docConfig.showDeliveryAddress && order.deliveryAddress && order.fulfillmentType === 'delivery' && (
            <div style={{ fontSize: '9pt', color: '#555', marginTop: 4 }}>
              {[order.deliveryAddress.street, order.deliveryAddress.area, order.deliveryAddress.city].filter(Boolean).join(', ')}
              {order.deliveryAddress.notes && <div style={{ color: '#888' }}>{order.deliveryAddress.notes}</div>}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: '8pt', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Order Info</div>
          <table style={{ fontSize: '9pt', borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              <tr><td style={{ color: '#888', paddingRight: 8, paddingBottom: 2 }}>Order #</td><td style={{ fontWeight: 600 }}>{order.orderNumber}</td></tr>
              {docConfig.showChannel && <tr><td style={{ color: '#888', paddingRight: 8, paddingBottom: 2 }}>Channel</td><td>{capFirst(order.channel)}</td></tr>}
              <tr><td style={{ color: '#888', paddingRight: 8, paddingBottom: 2 }}>Type</td><td>{capFirst(order.fulfillmentType)}</td></tr>
              {docConfig.showSalesAgent && order.salesAgentName && <tr><td style={{ color: '#888', paddingRight: 8, paddingBottom: 2 }}>Sales Agent</td><td>{order.salesAgentName}</td></tr>}
              {docConfig.showDeliveryAgent && order.deliveryAgentName && <tr><td style={{ color: '#888', paddingRight: 8, paddingBottom: 2 }}>Delivery Agent</td><td>{order.deliveryAgentName}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Line Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5mm' }}>
        <thead>
          <tr style={{ background: accent, color: '#fff' }}>
            <th style={{ textAlign: 'left', padding: '5px 8px', fontSize: '9pt', fontWeight: 600 }}>Item</th>
            <th style={{ textAlign: 'center', padding: '5px 8px', fontSize: '9pt', fontWeight: 600, width: '10%' }}>Qty</th>
            <th style={{ textAlign: 'right', padding: '5px 8px', fontSize: '9pt', fontWeight: 600, width: '18%' }}>Unit Price</th>
            <th style={{ textAlign: 'right', padding: '5px 8px', fontSize: '9pt', fontWeight: 600, width: '18%' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, idx) => (
            <tr key={idx} style={{ background: idx % 2 === 0 ? '#f9fafb' : '#fff', borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '5px 8px', fontSize: '9pt' }}>{item.inventoryItemName}</td>
              <td style={{ padding: '5px 8px', fontSize: '9pt', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ padding: '5px 8px', fontSize: '9pt', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.unitPrice, currency)}</td>
              <td style={{ padding: '5px 8px', fontSize: '9pt', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.lineTotal, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6mm' }}>
        <table style={{ fontSize: '9pt', borderCollapse: 'collapse', minWidth: 220 }}>
          <tbody>
            <tr>
              <td style={{ color: '#666', paddingRight: 16, paddingBottom: 3 }}>Subtotal</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(order.subtotal, currency)}</td>
            </tr>
            {order.discountAmount > 0 && (
              <tr>
                <td style={{ color: '#666', paddingRight: 16, paddingBottom: 3 }}>Discount</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#16a34a' }}>-{fmt(order.discountAmount, currency)}</td>
              </tr>
            )}
            {order.taxAmount > 0 && (
              <tr>
                <td style={{ color: '#666', paddingRight: 16, paddingBottom: 3 }}>Tax</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>+{fmt(order.taxAmount, currency)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={2}><div style={{ borderTop: `2px solid ${accent}`, margin: '4px 0' }} /></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, fontSize: '11pt', paddingRight: 16 }}>TOTAL</td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '11pt', fontFamily: 'monospace', color: accent }}>{fmt(order.total, currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment entries */}
      {payments.length > 0 && (
        <div style={{ marginBottom: '6mm', background: '#f9fafb', borderRadius: 8, padding: '4mm 5mm', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '8pt', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Payment</div>
          {payments.map((p, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', paddingBottom: 3 }}>
              <span style={{ color: '#555' }}>{p.paymentMethod ? capFirst(p.paymentMethod) : 'Payment'}{p.note ? ` — ${p.note}` : ''}</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{fmt(p.amount, currency)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: '9pt' }}>
            <span style={{ fontWeight: 600 }}>Amount Paid</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#16a34a' }}>{fmt(order.amountPaid, currency)}</span>
          </div>
          {remaining > 0.001 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', marginTop: 2 }}>
              <span style={{ fontWeight: 600, color: '#b45309' }}>Balance Due</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#b45309' }}>{fmt(remaining, currency)}</span>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div style={{ marginBottom: '5mm', fontSize: '9pt', color: '#555' }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Notes</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{order.notes}</div>
        </div>
      )}

      {/* Footer */}
      {(docConfig.thankYouText || docConfig.termsText) && (
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '5mm', marginTop: '4mm' }}>
          {docConfig.thankYouText && (
            <div style={{ textAlign: 'center', fontSize: '10pt', fontWeight: 600, color: accent, marginBottom: 4 }}>
              {docConfig.thankYouText}
            </div>
          )}
          {docConfig.termsText && (
            <div style={{ fontSize: '8pt', color: '#888', textAlign: 'center', whiteSpace: 'pre-wrap' }}>
              {docConfig.termsText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
