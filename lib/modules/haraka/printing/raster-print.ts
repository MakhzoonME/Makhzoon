'use client';

import { toCanvas } from 'html-to-image';
import { EscPosBuilder } from './escpos-builder';
import { printRaw } from './webusb-transport';

const DOTS: Record<58 | 80, number> = { 58: 384, 80: 576 };

function canvasToMatrix(canvas: HTMLCanvasElement): boolean[][] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height).data;
  const matrix: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    const row: boolean[] = new Array(width);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = img[i + 3];
      const lum = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
      row[x] = alpha > 32 && lum < 200;
    }
    matrix.push(row);
  }
  return matrix;
}

export interface RasterPrintOptions {
  paperWidth: 58 | 80;
  /** Blank line-feeds after the cut. See EscPosBuilder.cut(). */
  cutFeed?: number;
  /** Copies to print. Org-wide setting — see ReceiptConfig.copies. */
  copies?: number;
}

/**
 * Rasterize a rendered receipt-preview DOM node and print it exactly as shown
 * on screen (logo included) — a single source of truth instead of maintaining
 * a separate ESC/POS text/canvas template that can drift from the preview.
 */
export async function printPreviewNode(node: HTMLElement, opts: RasterPrintOptions): Promise<boolean> {
  const dotWidth = DOTS[opts.paperWidth];
  const cssWidth = node.getBoundingClientRect().width || node.offsetWidth;
  if (!cssWidth) return false;
  const pixelRatio = dotWidth / cssWidth;
  const canvas = await toCanvas(node, { pixelRatio, cacheBust: true, backgroundColor: '#ffffff' });
  const matrix = canvasToMatrix(canvas);
  if (matrix.length === 0 || matrix[0].length === 0) return false;

  const b = new EscPosBuilder().init();
  // Chunked, not a single GS v 0 command — a full receipt can be tall enough
  // to exceed a printer's raster buffer, which silently truncates/misplaces
  // the tail (e.g. the footer bleeding into the next print job).
  b.rasterImageChunked(matrix);
  // No feed() here — cut() advances the paper past the blade itself.
  b.cut(opts.cutFeed ?? 0);
  return printRaw(b.build(), opts.copies ?? 1);
}
