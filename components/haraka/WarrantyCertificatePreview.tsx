'use client';

import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import Image from 'next/image';

export interface WarrantyCertificateData {
  certificateNumber: string;
  customerName: string;
  customerPhone: string | null;
  orderNumber: string;
  issueDate: string;       // YYYY-MM-DD
  startDate: string;       // YYYY-MM-DD
  endDate: string;         // YYYY-MM-DD
  vendor: string;
  items: Array<{ name: string; quantity: number; sku?: string | null }>;
  notes: string | null;
  termsText: string;
}

interface Props {
  data: WarrantyCertificateData;
  orgName: string;
  tagline?: string;
  taxNumber?: string;
  receiptConfig?: ReceiptConfig;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function WarrantyCertificatePreview({ data, orgName, tagline, taxNumber, receiptConfig }: Props) {
  const accent = receiptConfig?.accentColor || '#1d4ed8';
  const displayOrgName = receiptConfig?.orgName || orgName;

  return (
    <div
      id="warranty-certificate"
      style={{
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        background: '#fff',
        color: '#111',
        width: '210mm',
        minHeight: '297mm',
        padding: '14mm 16mm',
        boxSizing: 'border-box',
        fontSize: '10pt',
        lineHeight: 1.6,
        position: 'relative',
      }}
    >
      {/* Decorative border */}
      <div style={{ position: 'absolute', inset: '8mm', border: `2px solid ${accent}20`, borderRadius: 8, pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '8mm', paddingBottom: '6mm', borderBottom: `3px solid ${accent}` }}>
        {receiptConfig?.showLogo && receiptConfig.logo && (
          <div style={{ position: 'relative', width: 120, height: 56, marginBottom: 8 }}>
            <Image src={receiptConfig.logo} alt="logo" fill sizes="120px" style={{ objectFit: 'contain' }} />
          </div>
        )}
        <div style={{ fontSize: '18pt', fontWeight: 800, color: '#111', letterSpacing: '-0.5px' }}>{displayOrgName}</div>
        {tagline && <div style={{ fontSize: '10pt', color: '#666', marginTop: 2 }}>{tagline}</div>}
        {receiptConfig?.showTaxNumber && taxNumber && (
          <div style={{ fontSize: '9pt', color: '#888', marginTop: 2 }}>Tax No: {taxNumber}</div>
        )}

        <div style={{ marginTop: '6mm' }}>
          <div style={{ display: 'inline-block', background: accent, color: '#fff', padding: '6px 28px', borderRadius: 4, fontSize: '16pt', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>
            Warranty Certificate
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: '9pt', color: '#888' }}>
          Certificate No: <strong style={{ color: '#444' }}>{data.certificateNumber}</strong>
          {' · '}
          Issued: {fmtDate(data.issueDate)}
        </div>
      </div>

      {/* Customer + Order info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8mm', marginBottom: '8mm' }}>
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '5mm' }}>
          <div style={{ fontSize: '8pt', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Issued To</div>
          <div style={{ fontWeight: 700, fontSize: '13pt', marginBottom: 2 }}>{data.customerName}</div>
          {data.customerPhone && <div style={{ fontSize: '10pt', color: '#555' }}>{data.customerPhone}</div>}
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '5mm' }}>
          <div style={{ fontSize: '8pt', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Order Reference</div>
          <div style={{ fontWeight: 700, fontSize: '13pt', marginBottom: 2 }}>#{data.orderNumber}</div>
          <div style={{ fontSize: '10pt', color: '#555' }}>Vendor: {data.vendor}</div>
        </div>
      </div>

      {/* Warranty period — prominent */}
      <div style={{ background: `${accent}10`, border: `2px solid ${accent}`, borderRadius: 10, padding: '6mm 8mm', marginBottom: '8mm', textAlign: 'center' }}>
        <div style={{ fontSize: '9pt', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>Warranty Period</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12mm' }}>
          <div>
            <div style={{ fontSize: '8pt', color: '#888' }}>FROM</div>
            <div style={{ fontWeight: 800, fontSize: '14pt', color: '#111' }}>{fmtDate(data.startDate)}</div>
          </div>
          <div style={{ fontSize: '18pt', color: accent }}>→</div>
          <div>
            <div style={{ fontSize: '8pt', color: '#888' }}>TO</div>
            <div style={{ fontWeight: 800, fontSize: '14pt', color: '#111' }}>{fmtDate(data.endDate)}</div>
          </div>
        </div>
      </div>

      {/* Covered items */}
      <div style={{ marginBottom: '8mm' }}>
        <div style={{ fontSize: '9pt', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Covered Items</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: accent, color: '#fff' }}>
              <th style={{ textAlign: 'left', padding: '5px 8px', fontSize: '9pt', fontWeight: 600 }}>Item</th>
              {data.items.some((i) => i.sku) && (
                <th style={{ textAlign: 'left', padding: '5px 8px', fontSize: '9pt', fontWeight: 600, width: '22%' }}>SKU</th>
              )}
              <th style={{ textAlign: 'center', padding: '5px 8px', fontSize: '9pt', fontWeight: 600, width: '12%' }}>Qty</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#f9fafb' : '#fff', borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '6px 8px', fontSize: '10pt', fontWeight: 500 }}>{item.name}</td>
                {data.items.some((i) => i.sku) && (
                  <td style={{ padding: '6px 8px', fontSize: '9pt', color: '#666', fontFamily: 'monospace' }}>{item.sku || '—'}</td>
                )}
                <td style={{ padding: '6px 8px', fontSize: '10pt', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {data.notes && (
        <div style={{ marginBottom: '8mm', fontSize: '9pt', color: '#555' }}>
          <div style={{ fontWeight: 600, marginBottom: 3 }}>Notes</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{data.notes}</div>
        </div>
      )}

      {/* Terms */}
      {data.termsText && (
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '5mm', fontSize: '8pt', color: '#888' }}>
          <div style={{ fontWeight: 700, marginBottom: 3, color: '#555' }}>Terms & Conditions</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{data.termsText}</div>
        </div>
      )}

      {/* Signature line */}
      <div style={{ position: 'absolute', bottom: '16mm', left: '16mm', right: '16mm', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ textAlign: 'center', minWidth: 140 }}>
          <div style={{ borderBottom: `1px solid ${accent}`, marginBottom: 4, width: 140 }} />
          <div style={{ fontSize: '8pt', color: '#888' }}>Customer Signature</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '8pt', color: '#888', marginBottom: 4 }}>{displayOrgName}</div>
          <div style={{ borderBottom: `1px solid ${accent}`, marginBottom: 4, width: 140 }} />
          <div style={{ fontSize: '8pt', color: '#888' }}>Authorized Signature</div>
        </div>
      </div>
    </div>
  );
}
