'use client';

import QRCode from 'qrcode';
import type { PosTransaction } from '@/types';
import { receiptLabels, isRtl, type ReceiptLang } from '@/lib/receipts/labels';

/**
 * Canvas → 1-bit raster renderer for thermal receipts.
 *
 * Thermal printers cannot render Arabic as text (no Arabic font ROM, no letter
 * shaping, no RTL). The browser, however, shapes and lays out Arabic correctly
 * on a <canvas>. So for Arabic (or any language we want pixel-perfect) we draw
 * the whole receipt to an offscreen canvas at the printer's dot width, threshold
 * it to black/white, and send it as a GS v 0 raster bit-image.
 *
 * Returned matrix: rows of booleans, `true` = black dot.
 */

/** Localized, bilingual text fields needed to print a receipt. */
export interface ReceiptPrintText {
  orgName: string;
  orgNameAr: string;
  tagline: string;
  taglineAr: string;
  address: string;
  addressAr: string;
  phone: string;
  taxNumber: string;
  footerText: string;
  footerTextAr: string;
  showCashier: boolean;
  showTaxNumber: boolean;
  showFawtaraQr: boolean;
}

export interface CanvasReceiptOptions {
  paperWidth: 58 | 80;
  text: ReceiptPrintText;
  currency?: string;
}

// Printable dot width per paper size (203 dpi printers).
const DOTS: Record<58 | 80, number> = { 58: 384, 80: 576 };

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

export async function renderReceiptCanvas(
  transaction: PosTransaction,
  opts: CanvasReceiptOptions,
  lang: ReceiptLang,
): Promise<boolean[][]> {
  const W = DOTS[opts.paperWidth];
  const scale = W / 384;
  const pad = Math.round(12 * scale);
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

  // Pre-fetch QR matrix (async) before the synchronous paint pass.
  let qr: boolean[][] | null = null;
  if (t.showFawtaraQr && transaction.fawtara?.status === 'submitted' && transaction.fawtara.qrPayload) {
    qr = await qrMatrix(transaction.fawtara.qrPayload);
  }

  // ── Layout pass: a paint() that runs twice (measure, then draw). ──
  function paint(ctx: CanvasRenderingContext2D | null): number {
    let y = pad;
    const lineGap = Math.round(6 * scale);

    const text = (s: string, size: number, align: CanvasTextAlign, x: number, bold = false) => {
      if (ctx) {
        ctx.font = fontFor(size, bold);
        ctx.textAlign = align;
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#000';
        ctx.direction = rtl ? 'rtl' : 'ltr';
        ctx.fillText(s, x, y);
      }
      y += size + lineGap;
    };
    const center = (s: string, size: number, bold = false) => text(s, size, 'center', Math.round(W / 2), bold);
    const start = (s: string, size: number, bold = false) => text(s, size, startAlign, startX, bold);
    // label at the start edge, amount at the end edge, same baseline row
    const row = (label: string, amount: string, size: number, bold = false) => {
      if (ctx) {
        ctx.font = fontFor(size, bold);
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#000';
        ctx.direction = rtl ? 'rtl' : 'ltr';
        ctx.textAlign = startAlign;
        ctx.fillText(label, startX, y);
        ctx.textAlign = endAlign;
        ctx.fillText(amount, endX, y);
      }
      y += size + lineGap;
    };
    const divider = () => {
      if (ctx) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = Math.max(1, Math.round(scale));
        ctx.setLineDash([Math.round(4 * scale), Math.round(3 * scale)]);
        ctx.beginPath();
        ctx.moveTo(pad, y + lineGap);
        ctx.lineTo(W - pad, y + lineGap);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      y += Math.round(10 * scale);
    };
    const gap = (n = 1) => { y += Math.round(6 * scale) * n; };

    // Header
    center(orgName, F_TITLE, true);
    if (tagline) center(tagline, F_SMALL);
    if (address) center(address, F_SMALL);
    if (t.phone) center(t.phone, F_SMALL);

    if (transaction.status === 'refunded') {
      gap();
      center(L.refund, F_BASE, true);
    }
    divider();

    // Meta
    row(`${L.receipt} #${transaction.receiptNumber}`,
        new Date(transaction.createdAt).toLocaleDateString(rtl ? 'ar' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        F_SMALL);
    if (t.showCashier && transaction.cashierName) start(`${L.cashier}: ${transaction.cashierName}`, F_SMALL);
    if (transaction.customerName) start(`${L.customer}: ${transaction.customerName}`, F_SMALL);
    divider();

    // Items
    for (const item of transaction.items) {
      start(item.inventoryItemName, F_BASE);
      row(`${item.quantity} × ${fmt(item.unitPrice)}`, `${cur} ${fmt(item.lineTotal)}`, F_SMALL);
      if (item.discountAmount > 0) row(`  ${L.discount}`, `- ${fmt(item.discountAmount)}`, F_SMALL);
    }
    divider();

    // Totals
    row(L.subtotal, `${cur} ${fmt(transaction.subtotal)}`, F_SMALL);
    if (transaction.discountAmount > 0) row(L.discount, `- ${fmt(transaction.discountAmount)}`, F_SMALL);
    if (transaction.taxAmount > 0) row(L.tax, `${cur} ${fmt(transaction.taxAmount)}`, F_SMALL);
    row(L.total, `${cur} ${fmt(transaction.total)}`, F_BASE, true);
    divider();

    // Payments
    for (const p of transaction.payments) {
      const label = p.method === 'cash' ? L.cash
        : p.method === 'card' ? `${L.card}${p.cardLast4 ? ` ****${p.cardLast4}` : ''}`
        : p.method;
      row(label, `${cur} ${fmt(p.amount)}`, F_SMALL);
    }
    if (transaction.change > 0) row(L.change, `${cur} ${fmt(transaction.change)}`, F_SMALL);

    if (t.showTaxNumber && t.taxNumber) { gap(); start(`${L.taxNo}: ${t.taxNumber}`, F_SMALL); }

    // Fawtara QR
    if (qr) {
      gap();
      const modules = qr.length;
      const target = Math.round(W * 0.42);
      const cell = Math.max(1, Math.floor(target / modules));
      const qrPx = cell * modules;
      const ox = Math.round((W - qrPx) / 2);
      if (ctx) {
        ctx.fillStyle = '#000';
        for (let r = 0; r < modules; r++) {
          for (let c = 0; c < modules; c++) {
            if (qr[r][c]) ctx.fillRect(ox + c * cell, y + r * cell, cell, cell);
          }
        }
      }
      y += qrPx + lineGap;
      if (transaction.fawtara?.invoiceNumber) center(`${L.invoice} ${transaction.fawtara.invoiceNumber}`, F_SMALL);
    } else if (transaction.fawtara?.status === 'pending' || transaction.fawtara?.status === 'failed') {
      gap();
      center(L.fawtaraPending, F_SMALL);
    }

    // Footer
    divider();
    center(footer, F_SMALL);
    gap(2);

    return Math.ceil(y);
  }

  // Pass 1: measure height.
  const height = paint(null);

  // Pass 2: draw.
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, height);
  paint(ctx);

  // Threshold to 1-bit.
  const img = ctx.getImageData(0, 0, W, height).data;
  const matrix: boolean[][] = [];
  for (let yy = 0; yy < height; yy++) {
    const row: boolean[] = new Array(W);
    for (let xx = 0; xx < W; xx++) {
      const i = (yy * W + xx) * 4;
      // luminance; treat dark pixels as black dots
      const lum = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
      row[xx] = img[i + 3] > 32 && lum < 150;
    }
    matrix.push(row);
  }
  return matrix;
}
