'use client';

import QRCode from 'qrcode';
import type { PosTransaction, Organization } from '@/types';
import { EscPosBuilder } from './escpos-builder';

/**
 * Build a thermal receipt for a completed POS transaction.
 *
 * Width param matches paper size: 32 chars at 58mm, 48 chars at 80mm. We pad
 * label+amount rows manually because ESC/POS has no native table support.
 *
 * If the transaction has a Fawtara submission with a QR payload, the QR is
 * rendered as a raster bit-image at the bottom of the receipt.
 */

export interface ReceiptOptions {
  paperWidth: 58 | 80;
  organization: Pick<Organization, 'id' | 'name' | 'contactEmail'>;
}

function colsFor(width: 58 | 80): number {
  return width === 58 ? 32 : 48;
}

function row(left: string, right: string, cols: number): string {
  if (left.length + right.length >= cols) {
    return `${left.slice(0, cols - right.length - 1)} ${right}`;
  }
  const pad = cols - left.length - right.length;
  return `${left}${' '.repeat(pad)}${right}`;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

async function qrPayloadToMatrix(payload: string): Promise<boolean[][]> {
  // qrcode lib provides a 2D bool matrix via toCanvas/create; we use `create`
  // for a pure data representation.
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const data = qr.modules.data as unknown as Uint8Array;
  const matrix: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const r: boolean[] = [];
    for (let x = 0; x < size; x++) r.push(data[y * size + x] === 1);
    matrix.push(r);
    // Double rows so the QR is denser on thermal paper (otherwise it prints too small).
    matrix.push([...r]);
  }
  return matrix;
}

export async function buildReceipt(
  transaction: PosTransaction,
  opts: ReceiptOptions,
): Promise<Uint8Array> {
  const cols = colsFor(opts.paperWidth);
  const b = new EscPosBuilder().init();

  // Header
  b.align('center').bold(true).size(17).line(opts.organization.name);
  b.size(0).bold(false);
  if (opts.organization.contactEmail) b.line(opts.organization.contactEmail);
  b.feed(1);
  b.line(transaction.status === 'refunded' ? '*** REFUND ***' : 'Sales receipt');
  b.line(`Receipt ${transaction.receiptNumber}`);
  b.line(new Date(transaction.createdAt).toLocaleString());
  if (transaction.customerName) b.line(`Customer: ${transaction.customerName}`);
  b.line(`Cashier: ${transaction.cashierName}`);
  b.divider('=', cols);

  // Lines
  b.align('left');
  for (const line of transaction.items) {
    b.line(line.inventoryItemName);
    if (line.barcode) b.line(`  ${line.barcode}`);
    const qtyLine = `  ${line.quantity} × ${fmt(line.unitPrice)}`;
    b.line(row(qtyLine, fmt(line.lineTotal), cols));
    if (line.discountAmount > 0) {
      b.line(row('  Discount', `-${fmt(line.discountAmount)}`, cols));
    }
    if (line.taxAmount > 0) {
      b.line(row(`  Tax (${(line.taxRate * 100).toFixed(0)}%)`, fmt(line.taxAmount), cols));
    }
  }

  b.divider('-', cols);
  b.line(row('Subtotal', fmt(transaction.subtotal), cols));
  if (transaction.discountAmount > 0) b.line(row('Discount', `-${fmt(transaction.discountAmount)}`, cols));
  if (transaction.taxAmount > 0) b.line(row('Tax', fmt(transaction.taxAmount), cols));
  b.bold(true).line(row('TOTAL', fmt(transaction.total), cols)).bold(false);
  b.divider('-', cols);

  for (const p of transaction.payments) {
    const label = p.method === 'cash' ? 'Cash' : p.method === 'card' ? `Card${p.cardLast4 ? ` ****${p.cardLast4}` : ''}` : p.method;
    b.line(row(label, fmt(p.amount), cols));
  }
  if (transaction.change > 0) b.line(row('Change', fmt(transaction.change), cols));

  // Fawtara block
  if (transaction.fawtara?.status === 'submitted' && transaction.fawtara.qrPayload && transaction.fawtara.uuid) {
    b.feed(1);
    b.align('center');
    b.line(`Fawtara: ${transaction.fawtara.invoiceNumber ?? '—'}`);
    const matrix = await qrPayloadToMatrix(transaction.fawtara.qrPayload);
    b.qrRaster(matrix);
    b.line(transaction.fawtara.uuid.slice(0, 12));
  } else if (transaction.fawtara?.status === 'pending' || transaction.fawtara?.status === 'failed') {
    b.feed(1).align('center').line('Fawtara: pending e-invoicing');
  }

  // Footer
  b.feed(2).align('center').line('Thank you!');
  b.feed(1).cut();
  return b.build();
}
