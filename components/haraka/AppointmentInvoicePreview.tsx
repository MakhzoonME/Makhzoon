'use client';

import { useT } from '@/hooks/ui';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import type { AppointmentDocumentAppointment } from '@/lib/modules/haraka/appointments/appointment-document-loader';
import { APPOINTMENT_INVOICE_TITLE, APPOINTMENT_INVOICE_THANK_YOU } from '@/lib/modules/haraka/appointments/appointment-document-config';

interface Props {
  appointment: AppointmentDocumentAppointment;
  orgName: string;
  tagline: string;
  taxNumber: string;
  receiptConfig: ReceiptConfig;
  currency?: string;
}

function fmt(n: number, currency = 'JOD') {
  return `${Number(n).toFixed(3)} ${currency}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function AppointmentInvoicePreview({
  appointment: a, orgName, tagline, taxNumber, receiptConfig, currency = 'JOD',
}: Props) {
  const { t } = useT();
  const accent = receiptConfig.accentColor || '#1d4ed8';
  const docNumber = a.invoiceNumber ?? a.appointmentNumber;
  const remaining = a.total - a.amountPaid;

  return (
    <div
      id="appointment-document"
      style={{
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        background: '#fff', color: '#111',
        width: '210mm', minHeight: '297mm',
        padding: '14mm 16mm', boxSizing: 'border-box',
        fontSize: '10pt', lineHeight: 1.5,
      }}
    >
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
            {APPOINTMENT_INVOICE_TITLE}
          </div>
          <div style={{ fontSize: '9pt', color: '#444', marginTop: 4 }}><strong>#{docNumber}</strong></div>
          <div style={{ fontSize: '9pt', color: '#666', marginTop: 2 }}>{fmtDate(a.createdAt)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12mm', marginBottom: '8mm' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '8pt', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{t('invoicePreview.billTo')}</div>
          <div style={{ fontWeight: 600 }}>{a.customerName}</div>
          {a.customerPhone && <div style={{ fontSize: '9pt', color: '#555' }}>{a.customerPhone}</div>}
        </div>
        <div style={{ flex: 1 }}>
          {a.staffName && (
            <div>
              <div style={{ fontSize: '8pt', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{t('invoicePreview.assignedTo')}</div>
              <div style={{ fontSize: '9pt' }}>{a.staffName}</div>
            </div>
          )}
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8mm', fontSize: '9.5pt' }}>
        <thead>
          <tr style={{ backgroundColor: `${accent}12`, borderBottom: `2px solid ${accent}` }}>
            <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 700 }}>{t('invoicePreview.service')}</th>
            <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, width: 100 }}>{t('appointments.labelDuration')}</th>
            <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, width: 100 }}>{t('invoicePreview.total')}</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={{ padding: '5px 8px', verticalAlign: 'top', fontWeight: 500 }}>
              {a.serviceName ?? t('appointments.title')}
              <div style={{ fontSize: '8pt', fontWeight: 400, color: '#888', marginTop: 2 }}>
                {t('invoicePreview.scheduled')}: {fmtDate(a.scheduledAt)} {fmtTime(a.scheduledAt)}
              </div>
            </td>
            <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{a.durationMinutes} min</td>
            <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(a.price, currency)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8mm' }}>
        <div style={{ width: '55mm', fontSize: '9.5pt' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#555' }}>
            <span>{t('appointments.labelPrice')}</span><span style={{ fontFamily: 'monospace' }}>{fmt(a.price, currency)}</span>
          </div>
          {a.taxAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#555' }}>
              <span>{t('invoicePreview.tax')}</span><span style={{ fontFamily: 'monospace' }}>{fmt(a.taxAmount, currency)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: `2px solid ${accent}`, marginTop: 4, fontWeight: 700, fontSize: '11pt' }}>
            <span>{t('invoicePreview.total')}</span><span style={{ fontFamily: 'monospace', color: accent }}>{fmt(a.total, currency)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#22a' }}>
            <span>{t('haraka.amountPaid')}</span><span style={{ fontFamily: 'monospace' }}>{fmt(a.amountPaid, currency)}</span>
          </div>
          {remaining > 0.001 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#c74', fontWeight: 600 }}>
              <span>{t('invoicePreview.balanceDue')}</span><span style={{ fontFamily: 'monospace' }}>{fmt(remaining, currency)}</span>
            </div>
          )}
        </div>
      </div>

      {a.notes && (
        <div style={{ marginBottom: '6mm', padding: '4mm 6mm', backgroundColor: '#f9f9f9', borderRadius: 4, fontSize: '9pt', color: '#555' }}>
          <div style={{ fontWeight: 700, marginBottom: 2, color: '#333' }}>{t('invoicePreview.notes')}</div>
          {a.notes}
        </div>
      )}

      <div style={{ borderTop: '1px solid #eee', paddingTop: '5mm', textAlign: 'center', fontSize: '9pt', color: '#777' }}>
        <div style={{ fontWeight: 600 }}>{APPOINTMENT_INVOICE_THANK_YOU}</div>
      </div>
    </div>
  );
}
