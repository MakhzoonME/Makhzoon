'use client';

import QRCode from 'qrcode';
import type { PosTransaction } from '@/types';
import { receiptLabels, isRtl, type ReceiptLang } from '@/lib/receipts/labels';

/**
 * Canvas → 1-bit raster renderer for thermal receipts.
 *
 * This module is the single source of truth for what a thermal receipt looks
 * like. It renders the receipt once, at the printer's exact dot width, and
 * hands back two views of the same pixels:
 *
 *   • `dataUrl` — a PNG the preview shows as a plain <img>
 *   • `matrix`  — the same bitmap as 1-bit rows, streamed as a GS v 0 raster
 *
 * So the cashier previews literally the pixels that hit the paper. It also
 * sidesteps the printer's font ROM entirely: thermal printers have no Arabic
 * font, no letter shaping and no RTL, but the browser lays all of that out
 * correctly on a <canvas>.
 */

/** Localized, bilingual text + visibility flags needed to print a receipt. */
export interface ReceiptPrintText {
  orgName: string;
  orgNameAr: string;
  tagline: string;
  taglineAr: string;
  address: string;
  addressAr: string;
  phone: string;
  website: string;
  taxNumber: string;
  footerText: string;
  footerTextAr: string;
  /** Logo URL or data URL. Drawn at the top when `showLogo` is on. */
  logo: string | null;
  showLogo: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showWebsite: boolean;
  showCashier: boolean;
  showTaxNumber: boolean;
  showFawtaraQr: boolean;
  showItemizedTax: boolean;
}

export interface CanvasReceiptOptions {
  paperWidth: 58 | 80;
  text: ReceiptPrintText;
  currency?: string;
}

/** One render, two consumers: the preview <img> and the ESC/POS raster. */
export interface ReceiptRaster {
  /** Rows of booleans, `true` = black dot — what the printer gets. */
  matrix: boolean[][];
  /** PNG data URL of the exact same bitmap — what the preview shows. */
  dataUrl: string;
  width: number;
  height: number;
}

// Printable dot width per paper size (203 dpi printers).
const DOTS: Record<58 | 80, number> = { 58: 384, 80: 576 };

/** Bayer 4×4 ordered-dither threshold map, used for logo artwork only. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function fmt(n: number): string {
  return n.toFixed(2);
}

/** Pick a free-text value for the language, falling back to the other. */
function pick(lang: ReceiptLang, en: string, ar: string): string {
  const e = (en ?? '').trim();
  const a = (ar ?? '').trim();
  return lang === 'ar' ? (a || e) : (e || a);
}

async function qrMatrix(payload: string): Promise<boolean[][]> {
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const data = qr.modules.data as unknown as Uint8Array;
  const m: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) row.push(data[y * size + x] === 1);
    m.push(row);
  }
  return m;
}

/**
 * Load the logo for canvas use. Resolves to null on any failure (404, CORS,
 * non-image) — a missing logo must never block a sale from printing. The
 * `crossOrigin` hint matters: without it a remote logo taints the canvas and
 * the getImageData() threshold pass throws.
 */
function loadLogo(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
    // Cached images can already be complete before the handlers attach.
    if (img.complete && img.naturalWidth > 0) resolve(img);
  });
}

export async function renderReceiptRaster(
  transaction: PosTransaction,
  opts: CanvasReceiptOptions,
  lang: ReceiptLang,
): Promise<ReceiptRaster> {
  const W = DOTS[opts.paperWidth];
  const scale = W / 384;
  const pad = Math.round(14 * scale);
  const L = receiptLabels(lang);
  const rtl = isRtl(lang);
  const cur = opts.currency ?? 'JOD';
  const t = opts.text;

  // Font sizes (px) tuned for 384 dots, scaled up for 576.
  const F_TITLE = Math.round(30 * scale);
  const F_BASE = Math.round(22 * scale);
  const F_SMALL = Math.round(18 * scale);
  const fontFor = (size: number, bold = false) =>
    `${bold ? 'bold ' : ''}${size}px ${rtl ? '"Noto Naskh Arabic", "Geeza Pro", "Segoe UI", Tahoma, sans-serif' : '"Menlo", "Consolas", monospace'}`;

  const orgName = pick(lang, t.orgName, t.orgNameAr) || (rtl ? 'اسم المتجر' : 'Business');
  const tagline = pick(lang, t.tagline, t.taglineAr);
  const address = pick(lang, t.address, t.addressAr);
  const footer = pick(lang, t.footerText, t.footerTextAr) || L.thankYou;

  const startX = rtl ? W - pad : pad;
  const endX = rtl ? pad : W - pad;
  const startAlign: CanvasTextAlign = rtl ? 'right' : 'left';
  const endAlign: CanvasTextAlign = rtl ? 'left' : 'right';
  const contentW = W - pad * 2;

  // Async prep, before the synchronous paint passes.
  let qr: boolean[][] | null = null;
  if (t.showFawtaraQr && transaction.fawtara?.status === 'submitted' && transaction.fawtara.qrPayload) {
    qr = await qrMatrix(transaction.fawtara.qrPayload);
  }
  const logo = t.showLogo && t.logo ? await loadLogo(t.logo) : null;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = 16; // provisional; pass 1 measures the real height
  const ctx = canvas.getContext('2d');
  if (!ctx) return { matrix: [], dataUrl: '', width: W, height: 0 };

  // Where the logo landed, so the threshold pass can dither it instead of
  // hard-clipping a photographic logo to a black blob.
  let logoRect: { x: number; y: number; w: number; h: number } | null = null;

  /**
   * Layout + paint in one function, run twice: once to measure the height
   * (draw = false), once to actually paint. Measurement still needs a live
   * context because word-wrapping depends on measureText().
   */
  function paint(c: CanvasRenderingContext2D, draw: boolean): number {
    let y = pad;
    // Arabic needs more leading: with textBaseline 'top' the y is the top of the
    // em square, and Arabic marks (tanween, hamza) overshoot it — at Latin
    // leading they collide with the dashed rule above them.
    const lineGap = Math.round((rtl ? 10 : 6) * scale);

    const widthOf = (s: string, size: number, bold = false) => {
      c.font = fontFor(size, bold);
      return c.measureText(s).width;
    };

    /** Split `s` into lines that fit `max` px, breaking on words then chars. */
    const wrap = (s: string, size: number, max: number, bold = false): string[] => {
      if (widthOf(s, size, bold) <= max) return [s];
      const out: string[] = [];
      let line = '';
      for (const word of s.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (widthOf(next, size, bold) <= max) { line = next; continue; }
        if (line) out.push(line);
        // A single word wider than the roll — break it mid-word.
        if (widthOf(word, size, bold) > max) {
          let chunk = '';
          for (const ch of word) {
            if (widthOf(chunk + ch, size, bold) > max) { out.push(chunk); chunk = ch; }
            else chunk += ch;
          }
          line = chunk;
        } else {
          line = word;
        }
      }
      if (line) out.push(line);
      return out;
    };

    /** Shorten to fit `max` px, with an ellipsis. */
    const clip = (s: string, size: number, max: number, bold = false): string => {
      if (widthOf(s, size, bold) <= max) return s;
      let out = s;
      while (out.length > 1 && widthOf(`${out}…`, size, bold) > max) out = out.slice(0, -1);
      return `${out}…`;
    };

    const text = (s: string, size: number, align: CanvasTextAlign, x: number, bold = false) => {
      if (draw) {
        c.font = fontFor(size, bold);
        c.textAlign = align;
        c.textBaseline = 'top';
        c.fillStyle = '#000';
        c.direction = rtl ? 'rtl' : 'ltr';
        c.fillText(s, x, y);
      }
      y += size + lineGap;
    };
    const center = (s: string, size: number, bold = false) => {
      for (const ln of wrap(s, size, contentW, bold)) text(ln, size, 'center', Math.round(W / 2), bold);
    };
    const start = (s: string, size: number, bold = false) => {
      for (const ln of wrap(s, size, contentW, bold)) text(ln, size, startAlign, startX, bold);
    };
    // Label at the start edge, amount at the end edge, same baseline row.
    const row = (label: string, amount: string, size: number, bold = false) => {
      const amountW = widthOf(amount, size, bold);
      const shown = clip(label, size, contentW - amountW - Math.round(8 * scale), bold);
      if (draw) {
        c.font = fontFor(size, bold);
        c.textBaseline = 'top';
        c.fillStyle = '#000';
        c.direction = rtl ? 'rtl' : 'ltr';
        c.textAlign = startAlign;
        c.fillText(shown, startX, y);
        c.textAlign = endAlign;
        c.fillText(amount, endX, y);
      }
      y += size + lineGap;
    };
    // Dashed rule, spaced to look centred rather than to measure centred: the
    // line above has already contributed its trailing leading plus the unused
    // bottom of its em box, so an even split lands the rule visibly closer to
    // the text below it. Bias the geometry to compensate.
    const divider = () => {
      const above = Math.round((rtl ? 5 : 4) * scale);
      const below = Math.round((rtl ? 15 : 13) * scale);
      if (draw) {
        c.strokeStyle = '#000';
        c.lineWidth = Math.max(1, Math.round(scale));
        c.setLineDash([Math.round(4 * scale), Math.round(3 * scale)]);
        c.beginPath();
        c.moveTo(pad, y + above);
        c.lineTo(W - pad, y + above);
        c.stroke();
        c.setLineDash([]);
      }
      y += above + below;
    };
    const gap = (n = 1) => { y += Math.round(6 * scale) * n; };

    // ── Header ──
    if (logo) {
      const maxW = Math.round(W * 0.5);
      const maxH = Math.round(70 * scale);
      const ratio = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight, 1);
      const lw = Math.round(logo.naturalWidth * ratio);
      const lh = Math.round(logo.naturalHeight * ratio);
      const lx = Math.round((W - lw) / 2);
      if (draw) {
        c.drawImage(logo, lx, y, lw, lh);
        logoRect = { x: lx, y, w: lw, h: lh };
      }
      y += lh + Math.round(8 * scale);
    }

    center(orgName, F_TITLE, true);
    if (tagline) center(tagline, F_SMALL);
    if (t.showAddress && address) center(address, F_SMALL);
    if (t.showPhone && t.phone) center(t.phone, F_SMALL);
    if (t.showWebsite && t.website) center(t.website, F_SMALL);

    if (transaction.status !== 'completed') {
      gap();
      center(transaction.status === 'refunded' ? L.refund : L.status.voided, F_BASE, true);
    }
    divider();

    // ── Meta ──
    row(`${L.receipt} #${transaction.receiptNumber}`,
        new Date(transaction.createdAt).toLocaleDateString(rtl ? 'ar' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        F_SMALL);
    if (t.showCashier && transaction.cashierName) start(`${L.cashier}: ${transaction.cashierName}`, F_SMALL);
    if (transaction.customerName) start(`${L.customer}: ${transaction.customerName}`, F_SMALL);
    divider();

    // ── Items ──
    for (const item of transaction.items) {
      start(item.inventoryItemName, F_BASE);
      row(`${item.quantity} × ${fmt(item.unitPrice)}`, `${cur} ${fmt(item.lineTotal)}`, F_SMALL);
      if (item.discountAmount > 0) row(`  ${L.discount}`, `- ${fmt(item.discountAmount)}`, F_SMALL);
    }
    divider();

    // ── Totals ──
    row(L.subtotal, `${cur} ${fmt(transaction.subtotal)}`, F_SMALL);
    if (transaction.discountAmount > 0) row(L.discount, `- ${fmt(transaction.discountAmount)}`, F_SMALL);
    if (t.showItemizedTax && transaction.taxAmount > 0) row(L.tax, `${cur} ${fmt(transaction.taxAmount)}`, F_SMALL);
    row(L.total, `${cur} ${fmt(transaction.total)}`, F_BASE, true);

    // ── Payments ──
    if (transaction.payments.length > 0 || transaction.change > 0) {
      divider();
      for (const p of transaction.payments) {
        const label = p.method === 'cash' ? L.cash
          : p.method === 'card' ? `${L.card}${p.cardLast4 ? ` ****${p.cardLast4}` : ''}`
          : p.method;
        row(label, `${cur} ${fmt(p.amount)}`, F_SMALL);
      }
      if (transaction.change > 0) row(L.change, `${cur} ${fmt(transaction.change)}`, F_SMALL);
    }

    if (t.showTaxNumber && t.taxNumber) { gap(); start(`${L.taxNo}: ${t.taxNumber}`, F_SMALL); }

    // ── Fawtara QR ──
    if (qr) {
      gap();
      const modules = qr.length;
      const target = Math.round(W * 0.42);
      const cell = Math.max(1, Math.floor(target / modules));
      const qrPx = cell * modules;
      const ox = Math.round((W - qrPx) / 2);
      if (draw) {
        c.fillStyle = '#000';
        for (let r = 0; r < modules; r++) {
          for (let cc = 0; cc < modules; cc++) {
            if (qr[r][cc]) c.fillRect(ox + cc * cell, y + r * cell, cell, cell);
          }
        }
      }
      y += qrPx + lineGap;
      if (transaction.fawtara?.invoiceNumber) center(`${L.invoice} ${transaction.fawtara.invoiceNumber}`, F_SMALL);
    } else if (transaction.fawtara?.status === 'pending' || transaction.fawtara?.status === 'failed') {
      gap();
      center(L.fawtaraPending, F_SMALL);
    }

    // ── Footer ──
    // Balanced: the divider supplies equal space above and below the rule, then
    // the thank-you sits on the same `pad` margin the receipt opened with. No
    // trailing dead paper here — cut() feeds exactly what the cutter needs.
    if (footer) {
      divider();
      center(footer, F_SMALL);
      y -= lineGap; // the last line's trailing gap would double up with `pad`
    }
    y += pad;

    return Math.ceil(y);
  }

  // Pass 1: measure.
  const height = Math.max(1, paint(ctx, false));

  // Pass 2: draw. Resizing resets the context and clears the surface.
  canvas.height = height;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, height);
  paint(ctx, true);

  // Threshold to 1-bit. Text and rules take a hard cut; the logo rectangle is
  // ordered-dithered so photographic / gradient logos keep their shading.
  const image = ctx.getImageData(0, 0, W, height);
  const img = image.data;
  const lr = logoRect as { x: number; y: number; w: number; h: number } | null;
  const matrix: boolean[][] = [];
  for (let yy = 0; yy < height; yy++) {
    const row: boolean[] = new Array(W);
    const inLogoRow = !!lr && yy >= lr.y && yy < lr.y + lr.h;
    for (let xx = 0; xx < W; xx++) {
      const i = (yy * W + xx) * 4;
      const lum = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
      const black = img[i + 3] > 32 && lum < (
        inLogoRow && !!lr && xx >= lr.x && xx < lr.x + lr.w
          ? ((BAYER[yy & 3][xx & 3] + 0.5) / 16) * 255 // dithered: logo artwork
          : 150                                        // hard cut: text and rules
      );
      row[xx] = black;
      // Write the decision back so the PNG the preview shows IS the printer
      // bitmap — no anti-aliased greys on screen that the paper cannot produce.
      const v = black ? 0 : 255;
      img[i] = v; img[i + 1] = v; img[i + 2] = v; img[i + 3] = 255;
    }
    matrix.push(row);
  }
  ctx.putImageData(image, 0, 0);

  return { matrix, dataUrl: canvas.toDataURL('image/png'), width: W, height };
}

/** Back-compat shim for callers that only need the printer bitmap. */
export async function renderReceiptCanvas(
  transaction: PosTransaction,
  opts: CanvasReceiptOptions,
  lang: ReceiptLang,
): Promise<boolean[][]> {
  return (await renderReceiptRaster(transaction, opts, lang)).matrix;
}

/**
 * Stand-in transaction for the receipt-designer preview, where there is no
 * real sale to render yet.
 */
export function sampleReceiptTransaction(): PosTransaction {
  const now = new Date();
  return {
    id: 'preview', organizationId: '', sessionId: '', locationId: '',
    cashierId: '', cashierName: 'Ahmad K.',
    customerId: null, customerName: null,
    items: [
      { inventoryItemId: '1', inventoryItemName: 'Product A', sku: null, barcode: null, quantity: 2, unitPrice: 4.5, taxRateId: null, taxRate: 0.16, taxAmount: 1.44, discountAmount: 0, lineTotal: 9 },
      { inventoryItemId: '2', inventoryItemName: 'Product B', sku: null, barcode: null, quantity: 1, unitPrice: 4.5, taxRateId: null, taxRate: 0.16, taxAmount: 0.72, discountAmount: 0, lineTotal: 4.5 },
    ],
    subtotal: 13.5, taxAmount: 2.16, discountAmount: 0, total: 15.66,
    payments: [{ method: 'cash', amount: 20, reference: null, cardLast4: null }],
    change: 4.34,
    status: 'completed', receiptNumber: '1042', offlineId: 'preview',
    syncedAt: null, parentTransactionId: null, fawtara: null,
    createdAt: now, updatedAt: now,
  };
}
