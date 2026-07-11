'use client';

import { useT } from '@/hooks/ui';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import type { ServiceJobDocumentConfig } from '@/lib/modules/haraka/service-jobs/service-job-document-config';
import type { ServiceJobDocumentJob } from '@/lib/modules/haraka/service-jobs/service-job-document-loader';

interface Props {
  job:           ServiceJobDocumentJob;
  orgName:       string;
  tagline:       string;
  taxNumber:     string;
  receiptConfig: ReceiptConfig;
  docConfig:     ServiceJobDocumentConfig;
  currency?:     string;
  locale?:       string;
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

export function ServiceJobInvoicePreview({
  job, orgName, tagline, taxNumber, receiptConfig, docConfig, currency = 'JOD',
}: Props) {
  const { t } = useT();
  const accent    = receiptConfig.accentColor || '#1d4ed8';
  const docNumber = job.invoiceNumber ?? job.jobNumber;
  const remaining = job.total - job.amountPaid;

  return (
    <div
      id="service-job-document"
      style={{
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        background: '#fff', color: '#111',
        width: '210mm', minHeight: '297mm',
        padding: '14mm 16mm', boxSizing: 'border-box',
        fontSize: '10pt', lineHeight: 1.5,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8mm', borderBottom: `2px solid ${accent}`, paddingBottom: '6mm' }}>
        <div>
          {receiptConfig.showLogo && receiptConfig.logo && (
            <div style={{ position: 'relative', width: 120, height: 48, marginBottom: 8 }}>
              <img src={receiptConfig.logo} alt="logo" style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
            </div>
          )}
          <div style={{ fontSize: '16pt', fontWeight: 700 }}>{receiptConfig.orgName || orgName}</div>
          {tagline && <div style={{ fontSize: '9pt', color: '#666', marginTop: 2 }}>{tagline}</div>}
          {receiptConfig.showAddress && receiptConfig.address && (
            <div style={{ fontSize: '9pt', color: '#666', marginTop: 4 }}>{receiptConfig.address}</div>
          )}
          {receiptConfig.showPhone && receiptConfig.phone && (
            <div style={{ fontSize: '9pt', color: '#666', marginTop: 2 }}>{receiptConfig.phone}</div>
          )}
          {taxNumber && <div style={{ fontSize: '9pt', color: '#666', marginTop: 2 }}>Tax No: {taxNumber}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18pt', fontWeight: 800, color: accent, letterSpacing: '-0.5px' }}>
            {docConfig.invoiceTitle}
          </div>
          <div style={{ fontSize: '9pt', color: '#444', marginTop: 4 }}><strong>#{docNumber}</strong></div>
          <div style={{ fontSize: '9pt', color: '#666', marginTop: 2 }}>{fmtDate(job.createdAt)}</div>
          {job.scheduledAt && (
            <div style={{ fontSize: '9pt', color: '#666', marginTop: 2 }}>
              {t('invoicePreview.scheduled')}: {fmtDate(job.scheduledAt)}
            </div>
          )}
        </div>
      </div>

      {/* Bill to / job meta */}
      <div style={{ display: 'flex', gap: '12mm', marginBottom: '8mm' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '8pt', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{t('invoicePreview.billTo')}</div>
          <div style={{ fontWeight: 600 }}>{job.customerName}</div>
          {job.customerPhone && <div style={{ fontSize: '9pt', color: '#555' }}>{job.customerPhone}</div>}
        </div>
        <div style={{ flex: 1 }}>
          {docConfig.showServiceType && job.serviceType && (
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: '8pt', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{t('invoicePreview.serviceType')}</div>
              <div style={{ fontSize: '9pt' }}>{capFirst(job.serviceType)}</div>
            </div>
          )}
          {docConfig.showStaffMember && job.staffMemberName && (
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: '8pt', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{t('invoicePreview.assignedTo')}</div>
              <div style={{ fontSize: '9pt' }}>{job.staffMemberName}</div>
            </div>
          )}
          {docConfig.showServiceAddress && job.serviceAddress && (
            <div>
              <div style={{ fontSize: '8pt', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{t('invoicePreview.serviceAddress')}</div>
              <div style={{ fontSize: '9pt', color: '#555' }}>
                {[job.serviceAddress.street, job.serviceAddress.area, job.serviceAddress.city].filter(Boolean).join(', ')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8mm', fontSize: '9.5pt' }}>
        <thead>
          <tr style={{ backgroundColor: `${accent}12`, borderBottom: `2px solid ${accent}` }}>
            <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 700 }}>{t('invoicePreview.service')}</th>
            <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, width: 60 }}>{t('invoicePreview.qty')}</th>
            <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, width: 90 }}>{t('invoicePreview.unitPrice')}</th>
            <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, width: 90 }}>{t('invoicePreview.discount')}</th>
            <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, width: 100 }}>{t('invoicePreview.total')}</th>
          </tr>
        </thead>
        <tbody>
          {job.items.map((l, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '5px 8px', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 500 }}>{l.name}</div>
                {l.description && <div style={{ fontSize: '8.5pt', color: '#777', marginTop: 2 }}>{l.description}</div>}
              </td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{l.quantity}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(l.unitPrice, currency)}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#e44' }}>
                {l.discountAmount > 0 ? `−${fmt(l.discountAmount, currency)}` : '—'}
              </td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(l.lineTotal, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8mm' }}>
        <div style={{ width: '55mm', fontSize: '9.5pt' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#555' }}>
            <span>{t('invoicePreview.subtotal')}</span><span style={{ fontFamily: 'monospace' }}>{fmt(job.subtotal, currency)}</span>
          </div>
          {job.discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#e44' }}>
              <span>{t('invoicePreview.discount')}</span><span style={{ fontFamily: 'monospace' }}>−{fmt(job.discountAmount, currency)}</span>
            </div>
          )}
          {job.taxAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#555' }}>
              <span>{t('invoicePreview.tax')}</span><span style={{ fontFamily: 'monospace' }}>{fmt(job.taxAmount, currency)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: `2px solid ${accent}`, marginTop: 4, fontWeight: 700, fontSize: '11pt' }}>
            <span>{t('invoicePreview.total')}</span><span style={{ fontFamily: 'monospace', color: accent }}>{fmt(job.total, currency)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#22a' }}>
            <span>{t('invoicePreview.subtotal')}</span><span style={{ fontFamily: 'monospace' }}>{fmt(job.amountPaid, currency)}</span>
          </div>
          {remaining > 0.001 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#c74', fontWeight: 600 }}>
              <span>{t('invoicePreview.balanceDue')}</span><span style={{ fontFamily: 'monospace' }}>{fmt(remaining, currency)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {job.notes && (
        <div style={{ marginBottom: '6mm', padding: '4mm 6mm', backgroundColor: '#f9f9f9', borderRadius: 4, fontSize: '9pt', color: '#555' }}>
          <div style={{ fontWeight: 700, marginBottom: 2, color: '#333' }}>{t('invoicePreview.notes')}</div>
          {job.notes}
        </div>
      )}

      {/* Footer */}
      {(docConfig.thankYouText || docConfig.termsText) && (
        <div style={{ borderTop: '1px solid #eee', paddingTop: '5mm', textAlign: 'center', fontSize: '9pt', color: '#777' }}>
          {docConfig.thankYouText && <div style={{ fontWeight: 600, marginBottom: 4 }}>{docConfig.thankYouText}</div>}
          {docConfig.termsText && <div style={{ fontSize: '8pt', whiteSpace: 'pre-line' }}>{docConfig.termsText}</div>}
        </div>
      )}
    </div>
  );
}
