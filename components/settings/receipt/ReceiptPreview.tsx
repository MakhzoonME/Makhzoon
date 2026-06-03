'use client';

import { receiptLabels, isRtl, pickText, type ReceiptLang } from '@/lib/receipts/labels';

export type TemplateId = 'thermal-58' | 'thermal-80' | 'a4-modern' | 'a4-invoice';

/** Org-level receipt language policy. 'both' is resolved to a concrete
 *  'en' | 'ar' by the caller (preview toggle / viewer toggle / cashier pick). */
export type ReceiptLanguage = 'en' | 'ar' | 'both';

export interface ReceiptConfig {
  template: TemplateId;
  showLogo: boolean;
  showTaxNumber: boolean;
  showCashier: boolean;
  showFawtaraQr: boolean;
  showItemizedTax: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showWebsite: boolean;
  footerText: string;
  footerTextAr: string;
  accentColor: string;
  logo: string | null;
  phone: string;
  address: string;
  addressAr: string;
  website: string;
  /** English business name override. Empty → falls back to the organization name. */
  orgName: string;
  orgNameAr: string;
  /** Which language(s) the business issues receipts in. */
  language: ReceiptLanguage;
}

/* Real receipt content. When omitted, the templates render SAMPLE_DATA so the
   settings page can preview the layout without a real sale. */
export interface ReceiptLine {
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ReceiptData {
  receiptNumber: string;
  dateLabel: string;
  cashierName: string;
  lines: ReceiptLine[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  status?: 'completed' | 'refunded' | 'voided';
  /** Pre-rendered Fawtara QR (data URL). Null → render a placeholder box. */
  qrCodeDataUrl?: string | null;
}

const SAMPLE_DATA: ReceiptData = {
  receiptNumber: '1042',
  dateLabel: '02 Jun 2026',
  cashierName: 'Ahmad K.',
  lines: [
    { name: 'Product A', qty: 2, unitPrice: 4.5, lineTotal: 9.0 },
    { name: 'Product B', qty: 1, unitPrice: 4.5, lineTotal: 4.5 },
  ],
  subtotal: 13.5,
  tax: 2.16,
  discount: 0,
  total: 15.66,
  currency: 'JOD',
};

function money(n: number, currency: string) {
  return `${currency} ${n.toFixed(2)}`;
}

interface PreviewProps {
  orgName: string;
  taxNumber: string;
  tagline: string;
  config: ReceiptConfig;
  /** Arabic counterparts for the bilingual free-text fields. */
  orgNameAr?: string;
  taglineAr?: string;
  /** Concrete language to render. Resolves config.language when 'both';
   *  falls back to config.language (or 'en') when not provided. */
  lang?: ReceiptLang;
  /** Real sale data; falls back to SAMPLE_DATA for the settings preview. */
  data?: ReceiptData;
}

/** Resolve the single language a template should render in. */
function resolveLang(props: PreviewProps): ReceiptLang {
  if (props.lang) return props.lang;
  return props.config.language === 'ar' ? 'ar' : 'en';
}

/* Small QR slot: real code when provided, placeholder box otherwise. */
function QrSlot({ dataUrl }: { dataUrl?: string | null }) {
  return (
    <div className="flex justify-center mt-3">
      {dataUrl
        ? <img src={dataUrl} alt="QR" className="w-16 h-16" />
        : <div className="w-14 h-14 border border-gray-300 bg-gray-50 flex items-center justify-center text-[7px] text-gray-400">QR</div>}
    </div>
  );
}

/* ── Thermal receipt (58mm / 80mm) ───────────────────────────── */
export function ThermalPreview(props: PreviewProps) {
  const { taxNumber, config, data } = props;
  const d = data ?? SAMPLE_DATA;
  const lang = resolveLang(props);
  const L = receiptLabels(lang);
  const rtl = isRtl(lang);
  const is80 = config.template === 'thermal-80';
  const w = is80 ? 260 : 200;

  const orgName = pickText(lang, config.orgName?.trim() || props.orgName, props.orgNameAr) || (lang === 'ar' ? 'اسم المتجر' : 'Business Name');
  const tagline = pickText(lang, props.tagline, props.taglineAr);
  const address = pickText(lang, config.address, config.addressAr);
  const footer = pickText(lang, config.footerText, config.footerTextAr);
  const statusLabel = d.status && d.status !== 'completed' ? L.status[d.status] : '';

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className={`${rtl ? 'font-sans' : 'font-mono'} text-[10px] leading-[1.45] bg-white border border-gray-200 shadow-md px-4 py-5 mx-auto`}
      style={{ width: w, color: '#111' }}
    >
      {config.showLogo && (
        <div className="flex justify-center mb-2">
          {config.logo
            ? <img src={config.logo} alt="logo" className="max-h-12 max-w-[80px] object-contain" />
            : <div className="w-10 h-10 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-[8px] text-gray-400">LOGO</div>}
        </div>
      )}
      <div className="text-center font-bold text-[11px] mb-0.5" style={{ color: config.accentColor }}>
        {orgName}
      </div>
      {tagline && <div className="text-center text-[9px] text-gray-500 mb-0.5">{tagline}</div>}
      {config.showAddress && address && <div className="text-center text-[9px] text-gray-400 mb-0.5">{address}</div>}
      {config.showPhone && config.phone && <div className="text-center text-[9px] text-gray-400 mb-0.5">{config.phone}</div>}
      {config.showWebsite && config.website && <div className="text-center text-[9px] text-gray-400 mb-0.5">{config.website}</div>}

      {statusLabel && (
        <div className="text-center text-[10px] font-bold uppercase tracking-wide text-red-600 mt-1">{statusLabel}</div>
      )}

      <div className="border-t border-dashed border-gray-300 my-2" />

      <div className="flex justify-between text-[9px] text-gray-500 mb-1">
        <span>{L.receipt} #{d.receiptNumber}</span>
        <span>{d.dateLabel}</span>
      </div>
      {config.showCashier && d.cashierName && <div className="text-[9px] text-gray-500 mb-1">{L.cashier}: {d.cashierName}</div>}

      <div className="border-t border-dashed border-gray-300 my-2" />

      {d.lines.map((item, i) => (
        <div key={`${item.name}-${i}`} className="flex justify-between mb-0.5">
          <span>{item.qty}× {item.name}</span>
          <span>{money(item.lineTotal, d.currency)}</span>
        </div>
      ))}

      <div className="border-t border-dashed border-gray-300 my-2" />

      <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
        <span>{L.subtotal}</span><span>{money(d.subtotal, d.currency)}</span>
      </div>
      {d.discount > 0 && (
        <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
          <span>{L.discount}</span><span>− {money(d.discount, d.currency)}</span>
        </div>
      )}
      {config.showItemizedTax && (
        <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
          <span>{L.tax}</span><span>{money(d.tax, d.currency)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-[11px] mt-1">
        <span>{L.total}</span><span style={{ color: config.accentColor }}>{money(d.total, d.currency)}</span>
      </div>

      {config.showTaxNumber && taxNumber && (
        <div className="text-[9px] text-gray-400 mt-1">{L.taxNo}: {taxNumber}</div>
      )}

      {config.showFawtaraQr && <QrSlot dataUrl={d.qrCodeDataUrl} />}

      {footer && (
        <>
          <div className="border-t border-dashed border-gray-300 mt-2 mb-1" />
          <div className="text-center text-[9px] text-gray-400">{footer}</div>
        </>
      )}
    </div>
  );
}

/* ── A4 Modern receipt ───────────────────────────────────────── */
export function A4ModernPreview(props: PreviewProps) {
  const { taxNumber, config, data } = props;
  const d = data ?? SAMPLE_DATA;
  const lang = resolveLang(props);
  const L = receiptLabels(lang);
  const rtl = isRtl(lang);

  const orgName = pickText(lang, config.orgName?.trim() || props.orgName, props.orgNameAr) || (lang === 'ar' ? 'اسم المتجر' : 'Business Name');
  const tagline = pickText(lang, props.tagline, props.taglineAr);
  const address = pickText(lang, config.address, config.addressAr);
  const footer = pickText(lang, config.footerText, config.footerTextAr);
  const statusLabel = d.status && d.status !== 'completed' ? L.status[d.status] : '';

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="bg-white border border-gray-200 shadow-md mx-auto text-[10px] leading-relaxed" style={{ width: 320, minHeight: 420, fontFamily: 'sans-serif' }}>
      {/* Header band */}
      <div className="px-6 py-4 text-white" style={{ background: config.accentColor }}>
        <div className="flex items-center gap-3">
          {config.showLogo && (
            config.logo
              ? <img src={config.logo} alt="logo" className="w-10 h-10 object-contain bg-white rounded p-0.5" />
              : <div className="w-10 h-10 rounded bg-white/20 flex items-center justify-center text-[8px]">LOGO</div>
          )}
          <div>
            <div className="font-bold text-[13px]">{orgName}</div>
            {tagline && <div className="text-[9px] opacity-80">{tagline}</div>}
          </div>
        </div>
        {(config.showAddress || config.showPhone) && (
          <div className="mt-2 text-[8px] opacity-80 space-y-0.5">
            {config.showAddress && address && <div>{address}</div>}
            {config.showPhone && config.phone && <div>{config.phone}</div>}
            {config.showWebsite && config.website && <div>{config.website}</div>}
          </div>
        )}
      </div>

      <div className="px-6 py-4">
        {/* Receipt meta */}
        <div className="flex justify-between mb-3 text-[9px]">
          <div>
            <div className="font-semibold text-gray-800">{L.salesReceipt}</div>
            <div className="text-gray-500"># {d.receiptNumber}</div>
            <div className="text-gray-500">{d.dateLabel}</div>
            {statusLabel && (
              <div className="mt-1 font-bold uppercase text-red-600">{statusLabel}</div>
            )}
          </div>
          {config.showCashier && d.cashierName && (
            <div className="text-end text-gray-500">
              <div>{L.cashier}</div>
              <div className="font-medium text-gray-700">{d.cashierName}</div>
            </div>
          )}
        </div>

        {/* Items table */}
        <table className="w-full text-[9px] mb-3">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-start py-1 text-gray-500 font-medium">{L.item}</th>
              <th className="text-center py-1 text-gray-500 font-medium">{L.qty}</th>
              <th className="text-end py-1 text-gray-500 font-medium">{L.price}</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((item, i) => (
              <tr key={`${item.name}-${i}`} className="border-b border-gray-100">
                <td className="py-1 text-gray-800">{item.name}</td>
                <td className="py-1 text-center text-gray-600">{item.qty}</td>
                <td className="py-1 text-end text-gray-800">{money(item.lineTotal, d.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="space-y-0.5 text-[9px]">
          <div className="flex justify-between text-gray-500"><span>{L.subtotal}</span><span>{money(d.subtotal, d.currency)}</span></div>
          {d.discount > 0 && <div className="flex justify-between text-gray-500"><span>{L.discount}</span><span>− {money(d.discount, d.currency)}</span></div>}
          {config.showItemizedTax && <div className="flex justify-between text-gray-500"><span>{L.tax}</span><span>{money(d.tax, d.currency)}</span></div>}
          <div className="flex justify-between font-bold text-[11px] pt-1 border-t border-gray-200" style={{ color: config.accentColor }}>
            <span>{L.total}</span><span>{money(d.total, d.currency)}</span>
          </div>
        </div>

        {config.showTaxNumber && taxNumber && (
          <div className="text-[9px] text-gray-400 mt-3">{L.taxReg}: {taxNumber}</div>
        )}

        {footer && (
          <div className="text-center text-[9px] text-gray-400 mt-4 pt-3 border-t border-dashed border-gray-200">
            {footer}
          </div>
        )}

        {config.showFawtaraQr && <QrSlot dataUrl={d.qrCodeDataUrl} />}
      </div>
    </div>
  );
}

/* ── A4 Invoice-style receipt ────────────────────────────────── */
export function A4InvoicePreview(props: PreviewProps) {
  const { taxNumber, config, data } = props;
  const d = data ?? SAMPLE_DATA;
  const lang = resolveLang(props);
  const L = receiptLabels(lang);
  const rtl = isRtl(lang);

  const orgName = pickText(lang, config.orgName?.trim() || props.orgName, props.orgNameAr) || (lang === 'ar' ? 'اسم المتجر' : 'Business Name');
  const tagline = pickText(lang, props.tagline, props.taglineAr);
  const address = pickText(lang, config.address, config.addressAr);
  const footer = pickText(lang, config.footerText, config.footerTextAr);
  const statusLabel = d.status && d.status !== 'completed' ? L.status[d.status] : '';

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="bg-white border border-gray-200 shadow-md mx-auto text-[10px] leading-relaxed" style={{ width: 320, minHeight: 440, fontFamily: 'sans-serif' }}>
      {/* Top header */}
      <div className="flex justify-between items-start px-6 pt-5 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {config.showLogo && (
            config.logo
              ? <img src={config.logo} alt="logo" className="w-10 h-10 object-contain" />
              : <div className="w-10 h-10 border border-gray-200 bg-gray-50 rounded flex items-center justify-center text-[8px] text-gray-400">LOGO</div>
          )}
          <div>
            <div className="font-bold text-[12px] text-gray-900">{orgName}</div>
            {tagline && <div className="text-[8px] text-gray-500">{tagline}</div>}
            {config.showAddress && address && <div className="text-[8px] text-gray-400">{address}</div>}
            {config.showPhone && config.phone && <div className="text-[8px] text-gray-400">{config.phone}</div>}
          </div>
        </div>
        <div className="text-end">
          <div className="text-[13px] font-bold tracking-wide" style={{ color: config.accentColor }}>{L.invoice}</div>
          <div className="text-[9px] text-gray-500 mt-1"># {d.receiptNumber}</div>
          <div className="text-[9px] text-gray-500">{d.dateLabel}</div>
          {config.showCashier && d.cashierName && <div className="text-[9px] text-gray-500 mt-1">{L.cashier}: {d.cashierName}</div>}
          {statusLabel && <div className="text-[9px] font-bold uppercase text-red-600 mt-1">{statusLabel}</div>}
        </div>
      </div>

      <div className="px-6 py-4">
        {/* Items table */}
        <table className="w-full text-[9px] mb-4 border-collapse">
          <thead>
            <tr style={{ background: config.accentColor + '18' }}>
              <th className="text-start py-1.5 px-2 font-semibold text-gray-700">{L.description}</th>
              <th className="text-center py-1.5 px-2 font-semibold text-gray-700">{L.qty}</th>
              <th className="text-end py-1.5 px-2 font-semibold text-gray-700">{L.unit}</th>
              <th className="text-end py-1.5 px-2 font-semibold text-gray-700">{L.total}</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((item, i) => (
              <tr key={`${item.name}-${i}`} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                <td className="py-1.5 px-2 text-gray-800">{item.name}</td>
                <td className="py-1.5 px-2 text-center text-gray-600">{item.qty}</td>
                <td className="py-1.5 px-2 text-end text-gray-600">{money(item.unitPrice, d.currency)}</td>
                <td className="py-1.5 px-2 text-end text-gray-800">{money(item.lineTotal, d.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals block — trailing edge aligned */}
        <div className="flex justify-end">
          <div className="w-40 space-y-0.5 text-[9px]">
            <div className="flex justify-between text-gray-500"><span>{L.subtotal}</span><span>{money(d.subtotal, d.currency)}</span></div>
            {config.showItemizedTax && (
              <>
                {d.discount > 0 && <div className="flex justify-between text-gray-500"><span>{L.discount}</span><span>− {money(d.discount, d.currency)}</span></div>}
                <div className="flex justify-between text-gray-500"><span>{L.tax}</span><span>{money(d.tax, d.currency)}</span></div>
              </>
            )}
            <div className="flex justify-between font-bold text-[11px] pt-1 border-t border-gray-300" style={{ color: config.accentColor }}>
              <span>{L.total}</span><span>{money(d.total, d.currency)}</span>
            </div>
          </div>
        </div>

        {config.showTaxNumber && taxNumber && (
          <div className="text-[9px] text-gray-400 mt-3">{L.taxReg}: {taxNumber}</div>
        )}

        {config.showWebsite && config.website && (
          <div className="text-[9px] text-gray-400">{config.website}</div>
        )}

        {footer && (
          <div className="text-center text-[9px] text-gray-400 mt-4 pt-3 border-t border-dashed border-gray-200">
            {footer}
          </div>
        )}

        {config.showFawtaraQr && <QrSlot dataUrl={d.qrCodeDataUrl} />}
      </div>
    </div>
  );
}

/* ── Dispatcher ──────────────────────────────────────────────── */
export function ReceiptPreview(props: PreviewProps) {
  switch (props.config.template) {
    case 'a4-modern':   return <A4ModernPreview {...props} />;
    case 'a4-invoice':  return <A4InvoicePreview {...props} />;
    default:            return <ThermalPreview {...props} />;
  }
}
