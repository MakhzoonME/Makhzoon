'use client';

import type { PosTransaction, Organization } from '@/types';
import { EscPosBuilder } from './escpos-builder';
import { renderReceiptRaster, type ReceiptPrintText } from './receipt-canvas';
import type { ReceiptLang } from '@/lib/receipts/labels';

/**
 * Build a thermal receipt for a completed POS transaction.
 *
 * The receipt is always sent as a raster bit-image (GS v 0) rendered from the
 * shared canvas renderer — never as ESC/POS text. That is deliberate:
 *
 *   • the preview shows that same bitmap, so what the cashier sees is exactly
 *     what prints — logo, QR, wrapping and all;
 *   • Arabic has no font ROM / shaping / RTL on any thermal printer, so text
 *     mode could never have handled it anyway;
 *   • the logo and the Fawtara QR are images regardless.
 *
 * Callers that already rendered the raster for the preview should pass its
 * `matrix` straight to `buildReceiptFromMatrix` rather than re-rendering.
 */

export interface ReceiptOptions {
  paperWidth: 58 | 80;
  organization: Pick<Organization, 'id' | 'name' | 'contactEmail'>;
  /** Localized bilingual content from the org receipt config. */
  text: ReceiptPrintText;
  /** Concrete language to print in. Defaults to English. */
  lang?: ReceiptLang;
  currency?: string;
}

/**
 * Wrap an already-rendered bitmap in the ESC/POS envelope.
 *
 * Chunked, not one tall GS v 0: a full receipt can exceed a printer's raster
 * buffer, which silently truncates or misplaces the tail — the footer bleeding
 * into the next job. `cutFeed` is org-wide extra tear-off slack; the paper
 * needed to clear the cutter blade is added by cut() regardless.
 */
export function buildReceiptFromMatrix(matrix: boolean[][], cutFeed?: number): Uint8Array {
  return new EscPosBuilder().init().rasterImageChunked(matrix).cut(cutFeed).build();
}

export async function buildReceipt(
  transaction: PosTransaction,
  opts: ReceiptOptions,
): Promise<Uint8Array> {
  const { matrix } = await renderReceiptRaster(
    transaction,
    { paperWidth: opts.paperWidth, text: opts.text, currency: opts.currency },
    opts.lang === 'ar' ? 'ar' : 'en',
  );
  return buildReceiptFromMatrix(matrix);
}
