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

interface PreviewProps {
  orgName: string;
  taxNumber: string;
  tagline: string;
  config: ReceiptConfig;
}

/* ── Thermal receipt (58mm / 80mm) ───────────────────────────── */
export function ThermalPreview({ orgName, taxNumber, tagline, config }: PreviewProps) {
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

      <div className="border-t border-dashed border-gray-300 my-2" />

      <div className="flex justify-between text-[9px] text-gray-500 mb-1">
        <span>Receipt #1042</span>
        <span>02 Jun 2026</span>
      </div>
      {config.showCashier && <div className="text-[9px] text-gray-500 mb-1">Cashier: Ahmad K.</div>}

      <div className="border-t border-dashed border-gray-300 my-2" />

      {[{ name: 'Product A', qty: 2, price: 'JOD 9.00' }, { name: 'Product B', qty: 1, price: 'JOD 4.50' }].map((item) => (
        <div key={item.name} className="flex justify-between mb-0.5">
          <span>{item.qty}× {item.name}</span>
          <span>{item.price}</span>
        </div>
      ))}

      <div className="border-t border-dashed border-gray-300 my-2" />

      <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
        <span>Subtotal</span><span>JOD 13.50</span>
      </div>
      {config.showItemizedTax && (
        <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
          <span>Tax (16%)</span><span>JOD 2.16</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-[11px] mt-1">
        <span>Total</span><span style={{ color: config.accentColor }}>JOD 15.66</span>
      </div>

      {config.showTaxNumber && taxNumber && (
        <div className="text-[9px] text-gray-400 mt-1">Tax #: {taxNumber}</div>
      )}

      {config.showFawtaraQr && (
        <div className="flex justify-center mt-3">
          <div className="w-14 h-14 border border-gray-300 bg-gray-50 flex items-center justify-center text-[7px] text-gray-400">QR</div>
        </div>
      )}

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
export function A4ModernPreview({ orgName, taxNumber, tagline, config }: PreviewProps) {
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
            <div className="text-gray-500"># 1042</div>
            <div className="text-gray-500">02 Jun 2026</div>
          </div>
          {config.showCashier && (
            <div className="text-right text-gray-500">
              <div>Cashier</div>
              <div className="font-medium text-gray-700">Ahmad K.</div>
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
            {[{ name: 'Product A', qty: 2, price: 'JOD 9.00' }, { name: 'Product B', qty: 1, price: 'JOD 4.50' }].map((item) => (
              <tr key={item.name} className="border-b border-gray-100">
                <td className="py-1 text-gray-800">{item.name}</td>
                <td className="py-1 text-center text-gray-600">{item.qty}</td>
                <td className="py-1 text-right text-gray-800">{item.price}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="space-y-0.5 text-[9px]">
          <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>JOD 13.50</span></div>
          {config.showItemizedTax && <div className="flex justify-between text-gray-500"><span>Tax (16%)</span><span>JOD 2.16</span></div>}
          <div className="flex justify-between font-bold text-[11px] pt-1 border-t border-gray-200" style={{ color: config.accentColor }}>
            <span>Total</span><span>JOD 15.66</span>
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

        {config.showFawtaraQr && (
          <div className="flex justify-center mt-3">
            <div className="w-14 h-14 border border-gray-300 bg-gray-50 flex items-center justify-center text-[7px] text-gray-400">QR</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── A4 Invoice-style receipt ────────────────────────────────── */
export function A4InvoicePreview({ orgName, taxNumber, tagline, config }: PreviewProps) {
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
          <div className="text-[9px] text-gray-500 mt-1"># 1042</div>
          <div className="text-[9px] text-gray-500">02 Jun 2026</div>
          {config.showCashier && <div className="text-[9px] text-gray-500 mt-1">Cashier: Ahmad K.</div>}
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
            {[{ name: 'Product A', qty: 2, unit: 'JOD 4.50', total: 'JOD 9.00' }, { name: 'Product B', qty: 1, unit: 'JOD 4.50', total: 'JOD 4.50' }].map((item, i) => (
              <tr key={item.name} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                <td className="py-1.5 px-2 text-gray-800">{item.name}</td>
                <td className="py-1.5 px-2 text-center text-gray-600">{item.qty}</td>
                <td className="py-1.5 px-2 text-right text-gray-600">{item.unit}</td>
                <td className="py-1.5 px-2 text-right text-gray-800">{item.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals block — right aligned */}
        <div className="flex justify-end">
          <div className="w-40 space-y-0.5 text-[9px]">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>JOD 13.50</span></div>
            {config.showItemizedTax && (
              <>
                <div className="flex justify-between text-gray-500"><span>Discount</span><span>— JOD 1.35</span></div>
                <div className="flex justify-between text-gray-500"><span>Tax (16%)</span><span>JOD 1.95</span></div>
              </>
            )}
            <div className="flex justify-between font-bold text-[11px] pt-1 border-t border-gray-300" style={{ color: config.accentColor }}>
              <span>Total</span><span>JOD 14.10</span>
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

        {config.showFawtaraQr && (
          <div className="flex justify-center mt-3">
            <div className="w-14 h-14 border border-gray-300 bg-gray-50 flex items-center justify-center text-[7px] text-gray-400">QR</div>
          </div>
        )}
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
