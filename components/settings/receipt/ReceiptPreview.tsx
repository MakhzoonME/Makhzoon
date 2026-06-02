'use client';

export type TemplateId = 'thermal-58' | 'thermal-80' | 'a4-modern' | 'a4-invoice';

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
  accentColor: string;
  logo: string | null;
  phone: string;
  address: string;
  website: string;
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
  /** Real sale data; falls back to SAMPLE_DATA for the settings preview. */
  data?: ReceiptData;
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
export function ThermalPreview({ orgName, taxNumber, tagline, config, data }: PreviewProps) {
  const d = data ?? SAMPLE_DATA;
  const is80 = config.template === 'thermal-80';
  const w = is80 ? 260 : 200;

  return (
    <div
      className="font-mono text-[10px] leading-[1.45] bg-white border border-gray-200 shadow-md px-4 py-5 mx-auto"
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
        {orgName || 'Business Name'}
      </div>
      {tagline && <div className="text-center text-[9px] text-gray-500 mb-0.5">{tagline}</div>}
      {config.showAddress && config.address && <div className="text-center text-[9px] text-gray-400 mb-0.5">{config.address}</div>}
      {config.showPhone && config.phone && <div className="text-center text-[9px] text-gray-400 mb-0.5">{config.phone}</div>}
      {config.showWebsite && config.website && <div className="text-center text-[9px] text-gray-400 mb-0.5">{config.website}</div>}

      {d.status && d.status !== 'completed' && (
        <div className="text-center text-[10px] font-bold uppercase tracking-wide text-red-600 mt-1">{d.status}</div>
      )}

      <div className="border-t border-dashed border-gray-300 my-2" />

      <div className="flex justify-between text-[9px] text-gray-500 mb-1">
        <span>Receipt #{d.receiptNumber}</span>
        <span>{d.dateLabel}</span>
      </div>
      {config.showCashier && d.cashierName && <div className="text-[9px] text-gray-500 mb-1">Cashier: {d.cashierName}</div>}

      <div className="border-t border-dashed border-gray-300 my-2" />

      {d.lines.map((item, i) => (
        <div key={`${item.name}-${i}`} className="flex justify-between mb-0.5">
          <span>{item.qty}× {item.name}</span>
          <span>{money(item.lineTotal, d.currency)}</span>
        </div>
      ))}

      <div className="border-t border-dashed border-gray-300 my-2" />

      <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
        <span>Subtotal</span><span>{money(d.subtotal, d.currency)}</span>
      </div>
      {d.discount > 0 && (
        <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
          <span>Discount</span><span>− {money(d.discount, d.currency)}</span>
        </div>
      )}
      {config.showItemizedTax && (
        <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
          <span>Tax</span><span>{money(d.tax, d.currency)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-[11px] mt-1">
        <span>Total</span><span style={{ color: config.accentColor }}>{money(d.total, d.currency)}</span>
      </div>

      {config.showTaxNumber && taxNumber && (
        <div className="text-[9px] text-gray-400 mt-1">Tax #: {taxNumber}</div>
      )}

      {config.showFawtaraQr && <QrSlot dataUrl={d.qrCodeDataUrl} />}

      {config.footerText && (
        <>
          <div className="border-t border-dashed border-gray-300 mt-2 mb-1" />
          <div className="text-center text-[9px] text-gray-400">{config.footerText}</div>
        </>
      )}
    </div>
  );
}

/* ── A4 Modern receipt ───────────────────────────────────────── */
export function A4ModernPreview({ orgName, taxNumber, tagline, config, data }: PreviewProps) {
  const d = data ?? SAMPLE_DATA;
  return (
    <div className="bg-white border border-gray-200 shadow-md mx-auto text-[10px] leading-relaxed" style={{ width: 320, minHeight: 420, fontFamily: 'sans-serif' }}>
      {/* Header band */}
      <div className="px-6 py-4 text-white" style={{ background: config.accentColor }}>
        <div className="flex items-center gap-3">
          {config.showLogo && (
            config.logo
              ? <img src={config.logo} alt="logo" className="w-10 h-10 object-contain bg-white rounded p-0.5" />
              : <div className="w-10 h-10 rounded bg-white/20 flex items-center justify-center text-[8px]">LOGO</div>
          )}
          <div>
            <div className="font-bold text-[13px]">{orgName || 'Business Name'}</div>
            {tagline && <div className="text-[9px] opacity-80">{tagline}</div>}
          </div>
        </div>
        {(config.showAddress || config.showPhone) && (
          <div className="mt-2 text-[8px] opacity-80 space-y-0.5">
            {config.showAddress && config.address && <div>{config.address}</div>}
            {config.showPhone && config.phone && <div>{config.phone}</div>}
            {config.showWebsite && config.website && <div>{config.website}</div>}
          </div>
        )}
      </div>

      <div className="px-6 py-4">
        {/* Receipt meta */}
        <div className="flex justify-between mb-3 text-[9px]">
          <div>
            <div className="font-semibold text-gray-800">Sales Receipt</div>
            <div className="text-gray-500"># {d.receiptNumber}</div>
            <div className="text-gray-500">{d.dateLabel}</div>
            {d.status && d.status !== 'completed' && (
              <div className="mt-1 font-bold uppercase text-red-600">{d.status}</div>
            )}
          </div>
          {config.showCashier && d.cashierName && (
            <div className="text-right text-gray-500">
              <div>Cashier</div>
              <div className="font-medium text-gray-700">{d.cashierName}</div>
            </div>
          )}
        </div>

        {/* Items table */}
        <table className="w-full text-[9px] mb-3">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-1 text-gray-500 font-medium">Item</th>
              <th className="text-center py-1 text-gray-500 font-medium">Qty</th>
              <th className="text-right py-1 text-gray-500 font-medium">Price</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((item, i) => (
              <tr key={`${item.name}-${i}`} className="border-b border-gray-100">
                <td className="py-1 text-gray-800">{item.name}</td>
                <td className="py-1 text-center text-gray-600">{item.qty}</td>
                <td className="py-1 text-right text-gray-800">{money(item.lineTotal, d.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="space-y-0.5 text-[9px]">
          <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{money(d.subtotal, d.currency)}</span></div>
          {d.discount > 0 && <div className="flex justify-between text-gray-500"><span>Discount</span><span>− {money(d.discount, d.currency)}</span></div>}
          {config.showItemizedTax && <div className="flex justify-between text-gray-500"><span>Tax</span><span>{money(d.tax, d.currency)}</span></div>}
          <div className="flex justify-between font-bold text-[11px] pt-1 border-t border-gray-200" style={{ color: config.accentColor }}>
            <span>Total</span><span>{money(d.total, d.currency)}</span>
          </div>
        </div>

        {config.showTaxNumber && taxNumber && (
          <div className="text-[9px] text-gray-400 mt-3">Tax Reg. #: {taxNumber}</div>
        )}

        {config.footerText && (
          <div className="text-center text-[9px] text-gray-400 mt-4 pt-3 border-t border-dashed border-gray-200">
            {config.footerText}
          </div>
        )}

        {config.showFawtaraQr && <QrSlot dataUrl={d.qrCodeDataUrl} />}
      </div>
    </div>
  );
}

/* ── A4 Invoice-style receipt ────────────────────────────────── */
export function A4InvoicePreview({ orgName, taxNumber, tagline, config, data }: PreviewProps) {
  const d = data ?? SAMPLE_DATA;
  return (
    <div className="bg-white border border-gray-200 shadow-md mx-auto text-[10px] leading-relaxed" style={{ width: 320, minHeight: 440, fontFamily: 'sans-serif' }}>
      {/* Top header */}
      <div className="flex justify-between items-start px-6 pt-5 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {config.showLogo && (
            config.logo
              ? <img src={config.logo} alt="logo" className="w-10 h-10 object-contain" />
              : <div className="w-10 h-10 border border-gray-200 bg-gray-50 rounded flex items-center justify-center text-[8px] text-gray-400">LOGO</div>
          )}
          <div>
            <div className="font-bold text-[12px] text-gray-900">{orgName || 'Business Name'}</div>
            {tagline && <div className="text-[8px] text-gray-500">{tagline}</div>}
            {config.showAddress && config.address && <div className="text-[8px] text-gray-400">{config.address}</div>}
            {config.showPhone && config.phone && <div className="text-[8px] text-gray-400">{config.phone}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-bold tracking-wide" style={{ color: config.accentColor }}>INVOICE</div>
          <div className="text-[9px] text-gray-500 mt-1"># {d.receiptNumber}</div>
          <div className="text-[9px] text-gray-500">{d.dateLabel}</div>
          {config.showCashier && d.cashierName && <div className="text-[9px] text-gray-500 mt-1">Cashier: {d.cashierName}</div>}
          {d.status && d.status !== 'completed' && <div className="text-[9px] font-bold uppercase text-red-600 mt-1">{d.status}</div>}
        </div>
      </div>

      <div className="px-6 py-4">
        {/* Items table */}
        <table className="w-full text-[9px] mb-4 border-collapse">
          <thead>
            <tr style={{ background: config.accentColor + '18' }}>
              <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Description</th>
              <th className="text-center py-1.5 px-2 font-semibold text-gray-700">Qty</th>
              <th className="text-right py-1.5 px-2 font-semibold text-gray-700">Unit</th>
              <th className="text-right py-1.5 px-2 font-semibold text-gray-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((item, i) => (
              <tr key={`${item.name}-${i}`} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                <td className="py-1.5 px-2 text-gray-800">{item.name}</td>
                <td className="py-1.5 px-2 text-center text-gray-600">{item.qty}</td>
                <td className="py-1.5 px-2 text-right text-gray-600">{money(item.unitPrice, d.currency)}</td>
                <td className="py-1.5 px-2 text-right text-gray-800">{money(item.lineTotal, d.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals block — right aligned */}
        <div className="flex justify-end">
          <div className="w-40 space-y-0.5 text-[9px]">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{money(d.subtotal, d.currency)}</span></div>
            {config.showItemizedTax && (
              <>
                {d.discount > 0 && <div className="flex justify-between text-gray-500"><span>Discount</span><span>− {money(d.discount, d.currency)}</span></div>}
                <div className="flex justify-between text-gray-500"><span>Tax</span><span>{money(d.tax, d.currency)}</span></div>
              </>
            )}
            <div className="flex justify-between font-bold text-[11px] pt-1 border-t border-gray-300" style={{ color: config.accentColor }}>
              <span>Total</span><span>{money(d.total, d.currency)}</span>
            </div>
          </div>
        </div>

        {config.showTaxNumber && taxNumber && (
          <div className="text-[9px] text-gray-400 mt-3">Tax Reg. #: {taxNumber}</div>
        )}

        {config.showWebsite && config.website && (
          <div className="text-[9px] text-gray-400">{config.website}</div>
        )}

        {config.footerText && (
          <div className="text-center text-[9px] text-gray-400 mt-4 pt-3 border-t border-dashed border-gray-200">
            {config.footerText}
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
