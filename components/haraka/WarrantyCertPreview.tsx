/* eslint-disable @next/next/no-img-element */
'use client';

import type { HarakaWarrantyCert, HarakaWarrantyConfig, WarrantyCertItem } from '@/types';
import { formatCurrency } from '@/lib/utils/format';

export type CertLang = 'en' | 'ar';

const LABELS = {
  en: {
    heading:    'WARRANTY CERTIFICATE',
    certNo:     'Certificate No.',
    issued:     'Issued',
    customer:   'Customer',
    phone:      'Phone',
    items:      'Covered Items',
    item:       'Item',
    qty:        'Qty',
    price:      'Unit Price',
    period:     'Warranty Period',
    from:       'From',
    to:         'To',
    terms:      'Terms & Conditions',
    signature:  'Authorised Signature',
    scan:       'Scan to verify',
  },
  ar: {
    heading:    'شهادة ضمان',
    certNo:     'رقم الشهادة',
    issued:     'تاريخ الإصدار',
    customer:   'العميل',
    phone:      'الهاتف',
    items:      'المنتجات المشمولة',
    item:       'المنتج',
    qty:        'الكمية',
    price:      'سعر الوحدة',
    period:     'فترة الضمان',
    from:       'من',
    to:         'إلى',
    terms:      'الشروط والأحكام',
    signature:  'التوقيع المخوّل',
    scan:       'امسح للتحقق',
  },
}

function fmtDate(iso: string, lang: CertLang): string {
  try {
    return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-JO' : 'en-GB', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
  } catch {
    return iso
  }
}

/** Sample data shown in the settings page preview when no real cert is provided. */
const SAMPLE: HarakaWarrantyCert = {
  id: 'sample',
  organizationId: '',
  spaceId: null,
  warrantyNumber: 'WRT-000001',
  sourceType: 'order',
  orderId: null,
  transactionId: null,
  customerName: 'Ahmad Al-Rashid',
  customerPhone: '+962-79-0000000',
  items: [
    { inventoryItemId: '1', inventoryItemName: 'Laptop Pro 15"', sku: 'LP-001', quantity: 1, unitPrice: 1200 },
    { inventoryItemId: '2', inventoryItemName: 'Wireless Mouse',  sku: 'WM-009', quantity: 2, unitPrice: 25 },
  ],
  warrantyStartDate: new Date().toISOString().slice(0, 10),
  warrantyEndDate:   new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  notes: null,
  createdAt: new Date(),
  createdBy: null,
  updatedAt: new Date(),
  updatedBy: null,
}

interface Props {
  cert?: HarakaWarrantyCert | null
  config: HarakaWarrantyConfig
  orgName: string
  orgNameAr?: string
  lang: CertLang
  /** Base64 QR code data URL — rendered when config.showQr = true */
  qrDataUrl?: string | null
}

export function WarrantyCertPreview({ cert, config, orgName, orgNameAr, lang, qrDataUrl }: Props) {
  const data = cert ?? SAMPLE
  const L    = LABELS[lang]
  const isAr = lang === 'ar'
  const dir  = isAr ? 'rtl' : 'ltr'
  const accent = config.accentColor || '#C2185B'

  const displayOrgName = (isAr && orgNameAr) ? orgNameAr : orgName
  const header   = isAr ? (config.headerTextAr ?? config.headerText) : config.headerText
  const footer   = isAr ? (config.footerTextAr ?? config.footerText) : config.footerText
  const terms    = isAr ? (config.termsTextAr  ?? config.termsText)  : config.termsText

  const isThermal = config.template === 'thermal-58' || config.template === 'thermal-80'
  const width = config.template === 'thermal-58' ? 218 : config.template === 'thermal-80' ? 302 : 640

  if (isThermal) {
    return (
      <div
        dir={dir}
        style={{
          width, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5,
          background: '#fff', padding: '8px 10px', color: '#111',
        }}
      >
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
          {displayOrgName}
        </div>
        {header && <div style={{ textAlign: 'center', marginBottom: 4 }}>{header}</div>}
        <div style={{ textAlign: 'center', fontWeight: 700, marginBottom: 6, borderBottom: '1px dashed #888', paddingBottom: 4 }}>
          {L.heading}
        </div>
        <div>{L.certNo}: <strong>{data.warrantyNumber}</strong></div>
        <div>{L.issued}: {fmtDate(data.createdAt.toISOString().slice(0, 10), lang)}</div>
        <div style={{ marginTop: 4 }}>{L.customer}: {data.customerName}</div>
        {data.customerPhone && <div>{L.phone}: {data.customerPhone}</div>}
        <div style={{ borderTop: '1px dashed #888', margin: '6px 0', paddingTop: 4, fontWeight: 600 }}>{L.items}:</div>
        {(data.items as WarrantyCertItem[]).map((item, i) => (
          <div key={i} style={{ marginBottom: 2 }}>
            • {item.inventoryItemName} ×{item.quantity}
          </div>
        ))}
        <div style={{ borderTop: '1px dashed #888', margin: '6px 0', paddingTop: 4 }}>
          <div>{L.from}: {fmtDate(data.warrantyStartDate, lang)}</div>
          <div>{L.to}:   {fmtDate(data.warrantyEndDate, lang)}</div>
        </div>
        {terms && (
          <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>{terms}</div>
        )}
        {footer && (
          <div style={{ textAlign: 'center', marginTop: 6, fontSize: 9, color: '#888' }}>{footer}</div>
        )}
      </div>
    )
  }

  // ── A4 templates ─────────────────────────────────────────────────────────
  const isCertTemplate = config.template === 'a4-certificate'

  return (
    <div
      dir={dir}
      style={{
        width: 640,
        minHeight: isCertTemplate ? 900 : undefined,
        background: '#fff',
        fontFamily: isAr ? 'system-ui, sans-serif' : 'system-ui, sans-serif',
        color: '#111',
        position: 'relative',
        ...(isCertTemplate ? {
          border: `6px double ${accent}`,
          padding: '32px 40px',
        } : {
          padding: '32px 40px',
          borderTop: `4px solid ${accent}`,
        }),
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: accent }}>{displayOrgName}</div>
        {header && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{header}</div>}
      </div>

      {/* Title */}
      <div style={{
        textAlign: 'center', fontSize: 18, fontWeight: 700, letterSpacing: 2,
        textTransform: 'uppercase', color: accent,
        borderTop: `1px solid ${accent}44`, borderBottom: `1px solid ${accent}44`,
        padding: '12px 0', marginBottom: 24,
      }}>
        {L.heading}
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: 13 }}>
        <div><span style={{ color: '#888' }}>{L.certNo}: </span><strong>{data.warrantyNumber}</strong></div>
        <div><span style={{ color: '#888' }}>{L.issued}: </span>{fmtDate(data.createdAt.toISOString().slice(0, 10), lang)}</div>
      </div>

      {/* Customer */}
      <div style={{ background: `${accent}0d`, borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
        <div><span style={{ color: '#666' }}>{L.customer}: </span><strong>{data.customerName}</strong></div>
        {data.customerPhone && <div style={{ marginTop: 2 }}><span style={{ color: '#666' }}>{L.phone}: </span>{data.customerPhone}</div>}
      </div>

      {/* Items table */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: accent }}>{L.items}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: `${accent}18` }}>
              <th style={{ padding: '6px 8px', textAlign: isAr ? 'right' : 'left', fontWeight: 600 }}>{L.item}</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>{L.qty}</th>
              <th style={{ padding: '6px 8px', textAlign: isAr ? 'left' : 'right', fontWeight: 600 }}>{L.price}</th>
            </tr>
          </thead>
          <tbody>
            {(data.items as WarrantyCertItem[]).map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '6px 8px' }}>
                  {item.inventoryItemName}
                  {item.sku && <span style={{ color: '#999', fontSize: 10 }}> #{item.sku}</span>}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '6px 8px', textAlign: isAr ? 'left' : 'right', fontFamily: 'monospace' }}>
                  {formatCurrency(item.unitPrice, 'JOD')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Warranty period */}
      <div style={{
        border: `1.5px solid ${accent}44`, borderRadius: 8, padding: '14px 16px', marginBottom: 20,
        display: 'flex', gap: 40, fontSize: 13,
      }}>
        <div>
          <div style={{ color: '#888', fontSize: 11, marginBottom: 2 }}>{L.from}</div>
          <div style={{ fontWeight: 600 }}>{fmtDate(data.warrantyStartDate, lang)}</div>
        </div>
        <div style={{ borderLeft: `1px solid #ddd`, margin: '0 4px' }} />
        <div>
          <div style={{ color: '#888', fontSize: 11, marginBottom: 2 }}>{L.to}</div>
          <div style={{ fontWeight: 600, color: accent }}>{fmtDate(data.warrantyEndDate, lang)}</div>
        </div>
      </div>

      {/* Terms */}
      {terms && (
        <div style={{ marginBottom: 20, fontSize: 11, color: '#555', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#333' }}>{L.terms}</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{terms}</div>
        </div>
      )}

      {/* Footer row: signature + QR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 32 }}>
        {isCertTemplate && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #333', width: 160, marginBottom: 4 }} />
            <div style={{ fontSize: 11, color: '#666' }}>{L.signature}</div>
          </div>
        )}
        {config.showQr && qrDataUrl && (
          <div style={{ textAlign: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR" width={80} height={80} />
            <div style={{ fontSize: 9, color: '#888', marginTop: 2 }}>{L.scan}</div>
          </div>
        )}
      </div>

      {/* Footer text */}
      {footer && (
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 10, color: '#999', borderTop: '1px solid #eee', paddingTop: 10 }}>
          {footer}
        </div>
      )}
    </div>
  )
}
