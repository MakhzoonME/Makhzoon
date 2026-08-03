'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toPng, toJpeg } from 'html-to-image';
import QRCode from 'qrcode';
import { Copy, Check, Mail, Download, Printer, Receipt, FileImage, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogIconHeader, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ReceiptPreview, type ReceiptConfig, type ReceiptData } from '@/components/settings/receipt/ReceiptPreview';
import { ReceiptRasterPreview, useReceiptRaster } from '@/components/haraka/ReceiptRasterPreview';
import { buildReceiptFromMatrix } from '@/lib/modules/haraka/printing/receipt-template';
import { printRaw } from '@/lib/modules/haraka/printing/webusb-transport';
import { toPrintText } from '@/lib/receipts/receipt-config';
import type { ReceiptLang } from '@/lib/receipts/labels';
import { cn } from '@/lib/utils/cn';
import { toast } from '@/hooks/ui';
import { usePrinterStore } from '@/store/printer.store';
import { printPreviewNode } from '@/lib/modules/haraka/printing/raster-print';
import type { PosTransaction } from '@/types';

/** WhatsApp brand glyph (lucide ships no brand icons). */
function WhatsAppIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.207zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  );
}

const CURRENCY = 'JOD';

function formatDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Re-encode the receipt bitmap as JPEG, flattened onto white (JPEG has no alpha). */
function pngToJpeg(pngDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      if (!ctx) return reject(new Error('canvas unavailable'));
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => reject(new Error('could not decode receipt bitmap'));
    img.src = pngDataUrl;
  });
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: PosTransaction | null;
  /** Org subdomain — the public receipt lives at /r/[orgSlug]/[id]. */
  orgSlug: string;
  /** Org display name; Arabic + overrides come from config. */
  orgName: string;
  receiptBase: string;
  config: ReceiptConfig;
  tagline: string;
  taglineAr: string;
  taxNumber: string;
  /** Print automatically once, right after opening, in whichever language is
   *  currently selected (defaults to English for bilingual orgs — the toggle
   *  below still lets the cashier manually reprint in the other language). */
  autoPrint?: boolean;
  /** Called right after a print is sent (auto or manual) — e.g. to fire the
   *  cash drawer once, in sync with the receipt actually printing. */
  onPrinted?: () => void;
}

/**
 * Shown right after a sale completes: the cashier sees the receipt and can share
 * it (WhatsApp / copy link / email), download it as a PDF, or reprint it.
 *
 * The shareable artifact is the public receipt page at /r/[orgSlug]/[txId]; the
 * transaction id doubles as an unguessable capability token. "Download PDF"
 * opens that page with ?download=1, which triggers the browser's save-as-PDF.
 */
export function ReceiptShareDialog({
  open, onOpenChange, transaction, orgSlug, orgName, receiptBase,
  config, tagline, taglineAr, taxNumber, autoPrint, onPrinted,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [capturing, setCapturing] = useState<'png' | 'jpg' | null>(null);
  const [printing, setPrinting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const autoPrintedFor = useRef<string | null>(null);
  const { hydrate } = usePrinterStore();
  useEffect(() => { hydrate(); }, [hydrate]);
  // Paper size, copies, and cut feed are org-wide (ReceiptConfig), not local
  // browser state — every register should print the same way.
  const paperWidth: 58 | 80 = config.template === 'thermal-80' ? 80 : 58;
  // Extra tear-off only — blade clearance is handled inside cut(). Orgs whose
  // saved config predates the field send undefined, which must mean "none".
  const cutFeed = config.cutFeed ?? 0;
  const copies = config.copies;
  const bothLangs = config.language === 'both';
  const fixedLang: ReceiptLang = config.language === 'ar' ? 'ar' : 'en';
  const [previewLang, setPreviewLang] = useState<ReceiptLang>(fixedLang);
  const lang = bothLangs ? previewLang : fixedLang;

  const shareLink = transaction ? `${receiptBase}/r/${orgSlug}/${transaction.id}` : '';

  const isThermal = config.template === 'thermal-58' || config.template === 'thermal-80';

  // Render the real Fawtara QR (not a placeholder) for the A4 templates, which
  // still preview and print as DOM. The thermal raster draws its own QR from
  // the payload, so it does not need this.
  useEffect(() => {
    const payload = transaction?.fawtara?.status === 'submitted' ? transaction.fawtara.qrPayload : null;
    if (!payload) { setQrDataUrl(null); return; }
    let cancelled = false;
    QRCode.toDataURL(payload, { margin: 0 }).then((url) => { if (!cancelled) setQrDataUrl(url); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [transaction?.fawtara?.status, transaction?.fawtara?.qrPayload]);

  // Thermal preview = the printer bitmap itself. Rendering it while an A4
  // template is selected would be wasted work, so gate on the template.
  const { raster, loading: rasterLoading } = useReceiptRaster({
    transaction: isThermal ? transaction : null,
    text: toPrintText(config, { orgName, tagline, taglineAr, taxNumber }),
    paperWidth,
    lang,
    currency: CURRENCY,
  });

  const data: ReceiptData | undefined = useMemo(() => {
    if (!transaction) return undefined;
    return {
      receiptNumber: transaction.receiptNumber,
      dateLabel: formatDate(transaction.createdAt),
      cashierName: transaction.cashierName,
      lines: transaction.items.map((l) => ({
        name: l.inventoryItemName,
        qty: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
      })),
      subtotal: transaction.subtotal,
      tax: transaction.taxAmount,
      discount: transaction.discountAmount,
      total: transaction.total,
      currency: CURRENCY,
      status: transaction.status,
      qrCodeDataUrl: qrDataUrl,
    };
  }, [transaction, qrDataUrl]);

  /**
   * Print exactly what the preview shows. Thermal templates already exist as
   * the printer bitmap, so that matrix is sent straight through — same pixels,
   * same language, no second render that could drift. A4 templates are still
   * DOM, so they get rasterized from the preview node.
   */
  async function handlePrint() {
    if (printing) return;
    setPrinting(true);
    try {
      let ok: boolean;
      if (isThermal && raster && raster.matrix.length > 0) {
        ok = await printRaw(buildReceiptFromMatrix(raster.matrix, cutFeed), copies);
      } else {
        const node = captureRef.current;
        if (!node) return;
        ok = await printPreviewNode(node, { paperWidth, cutFeed, copies });
      }
      if (!ok) toast.info('No printer paired — receipt not printed');
    } catch (err) {
      console.error('[print receipt]', err);
      toast.error('Print failed');
    } finally {
      setPrinting(false);
      onPrinted?.();
    }
  }

  // Auto-print once per transaction — including bilingual orgs, in whichever
  // language is currently selected (defaults to English) — but only once what
  // we are going to send actually exists: the raster for thermal, the rendered
  // node (and its QR, if any) for A4. The language toggle above still lets the
  // cashier reprint in the other language manually afterward.
  const printable = isThermal ? !!raster : !!data;
  useEffect(() => {
    if (!open || !autoPrint || !transaction || !printable) return;
    if (autoPrintedFor.current === transaction.id) return;
    autoPrintedFor.current = transaction.id;
    handlePrint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoPrint, transaction, printable]);

  function copyLink() {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      toast.success('Receipt link copied');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error('Could not copy link'));
  }

  /**
   * Download the receipt as an image. Thermal receipts already exist as a
   * bitmap — hand that over directly rather than re-rasterizing the DOM. A4
   * templates are still HTML, so they go through html-to-image.
   */
  async function downloadImage(format: 'png' | 'jpg') {
    if (!transaction) return;
    setCapturing(format);
    try {
      let dataUrl: string;
      if (isThermal && raster) {
        dataUrl = format === 'png' ? raster.dataUrl : await pngToJpeg(raster.dataUrl);
      } else {
        const node = captureRef.current;
        if (!node) return;
        const opts = { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' };
        dataUrl = format === 'png' ? await toPng(node, opts) : await toJpeg(node, { ...opts, quality: 0.95 });
      }
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `receipt-${transaction.receiptNumber}.${format}`;
      a.click();
    } catch {
      toast.error('Could not generate image');
    } finally {
      setCapturing(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogIconHeader icon={<Receipt size={18} />} title={`Receipt #${transaction?.receiptNumber ?? ''}`} />

        <DialogBody className="space-y-4">
          {bothLangs && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-[11px] text-gray-400">Preview:</span>
              <div className="inline-flex rounded-md border border-border bg-surface-page p-0.5">
                {(['en', 'ar'] as const).map((lng) => (
                  <button
                    key={lng}
                    onClick={() => setPreviewLang(lng)}
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded transition-colors',
                      previewLang === lng ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900',
                    )}
                  >
                    {lng === 'en' ? 'English' : 'العربية'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Receipt preview. Thermal shows the printer bitmap as an image —
              this container is exactly what the Print button sends. */}
          <div
            className="rounded-xl overflow-hidden border border-border p-4 max-h-[44vh] overflow-y-auto"
            style={{ background: 'repeating-linear-gradient(45deg,#f4f4f4,#f4f4f4 6px,#fafafa 6px,#fafafa 12px)' }}
          >
            {isThermal ? (
              <ReceiptRasterPreview raster={raster} loading={rasterLoading} />
            ) : (
              /* Outer wrapper only scales for display; the captured node renders
                 at native resolution so exported images stay crisp. */
              <div className="flex justify-center" style={{ width: 280, overflow: 'hidden', margin: '0 auto' }}>
                <div style={{ transform: 'scale(0.875)', transformOrigin: 'top left', width: 320 }}>
                  <div ref={captureRef} style={{ display: 'inline-block', background: '#fff' }}>
                    {data && (
                      <ReceiptPreview
                        orgName={orgName}
                        orgNameAr={config.orgNameAr}
                        taxNumber={taxNumber}
                        tagline={tagline}
                        taglineAr={taglineAr}
                        lang={lang}
                        config={config}
                        data={data}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Share link */}
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-surface-page px-3 py-2">
            <span className="text-[11px] text-gray-500 truncate flex-1">{shareLink}</span>
            <button onClick={copyLink} className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            </button>
          </div>

          {/* Share */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs"
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareLink)}`, '_blank')}>
              <WhatsAppIcon size={13} />WhatsApp
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs"
              onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent('Your receipt')}&body=${encodeURIComponent(shareLink)}`; }}>
              <Mail size={13} />Email
            </Button>
          </div>

          {/* Download */}
          <div>
            <p className="text-[11px] font-medium text-gray-400 mb-1.5">Download</p>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                onClick={() => window.open(`${shareLink}?download=1`, '_blank')}>
                <Download size={13} />PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                disabled={capturing !== null || (isThermal && !raster)}
                onClick={() => downloadImage('png')}>
                {capturing === 'png' ? <Loader2 size={13} className="animate-spin" /> : <FileImage size={13} />}PNG
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                disabled={capturing !== null || (isThermal && !raster)}
                onClick={() => downloadImage('jpg')}>
                {capturing === 'jpg' ? <Loader2 size={13} className="animate-spin" /> : <FileImage size={13} />}JPG
              </Button>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          {transaction && (
            <Button variant="outline" onClick={handlePrint}
              disabled={printing || (isThermal && rasterLoading)} className="gap-2">
              {printing ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
              {printing ? 'Printing…' : 'Print'}
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
