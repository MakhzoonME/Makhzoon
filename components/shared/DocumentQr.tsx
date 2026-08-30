'use client';

import { useMemo } from 'react';
import { qrMatrix, type ResolvedDocumentQr, type QrPositionA4 } from '@/lib/qr';

const CORNER_OFFSET: Record<QrPositionA4, React.CSSProperties> = {
  'top-left':     { top: 0, left: 0 },
  'top-right':    { top: 0, right: 0 },
  'bottom-left':  { bottom: 0, left: 0 },
  'bottom-right': { bottom: 0, right: 0 },
};

interface Props {
  /** Output of `resolveDocumentQr` — render nothing when it returned null. */
  qr: ResolvedDocumentQr | null;
  /** Rendered edge length. Accepts any CSS length ('22mm' on A4, 88 on screen). */
  size?: number | string;
  /** Caption color; defaults to the muted grey the document footers use. */
  captionColor?: string;
  /**
   * 'inline' (default) renders in normal document flow — the caller decides
   * placement, as thermal receipts do (QR is one line in a linear layout). A
   * corner value instead absolutely positions the QR at that corner of the
   * nearest `position: relative` ancestor — the caller must provide one and
   * enough padding that page content doesn't run under it.
   */
  position?: QrPositionA4 | 'inline';
}

/**
 * QR code for a printable document, drawn as inline SVG.
 *
 * SVG rather than a PNG data URL because the matrix is computed synchronously
 * during render: `html-to-image` screenshots and `window.print()` both fire on
 * a user click that can land before an async `toDataURL` ever resolves, and a
 * half-rendered receipt is worse than none. It also stays crisp at 300dpi,
 * which a 512px raster scaled into a 22mm box does not.
 *
 * `shape-rendering: crispEdges` is load-bearing: without it the renderer
 * antialiases module edges into grey seams and phone scanners start missing it.
 */
export function DocumentQr({ qr, size = 88, captionColor = '#777', position = 'inline' }: Props) {
  const matrix = useMemo(() => (qr ? qrMatrix(qr.payload) : null), [qr]);
  if (!qr || !matrix) return null;

  const n = matrix.length;
  // One-module quiet zone each side. The spec asks for four; at these print
  // sizes the surrounding white space of the document already supplies it,
  // and four would shrink the modules below what a phone camera resolves.
  const quiet = 1;
  const span = n + quiet * 2;

  const rects: React.ReactElement[] = [];
  for (let y = 0; y < n; y++) {
    // Merge horizontal runs into one <rect> — a 25×25 QR is 625 nodes drawn
    // one-per-module, and these documents can hold several.
    let x = 0;
    while (x < n) {
      if (!matrix[y][x]) { x++; continue; }
      let run = 1;
      while (x + run < n && matrix[y][x + run]) run++;
      rects.push(
        <rect key={`${y}-${x}`} x={x + quiet} y={y + quiet} width={run} height={1} />,
      );
      x += run;
    }
  }

  const style: React.CSSProperties =
    position === 'inline'
      ? { display: 'inline-block', textAlign: 'center' }
      : { position: 'absolute', textAlign: 'center', ...CORNER_OFFSET[position] };

  return (
    <div style={style}>
      <svg
        viewBox={`0 0 ${span} ${span}`}
        width={size}
        height={size}
        shapeRendering="crispEdges"
        role="img"
        aria-label="Document QR code"
        style={{ display: 'block' }}
      >
        <rect x={0} y={0} width={span} height={span} fill="#fff" />
        <g fill="#000">{rects}</g>
      </svg>
      {qr.caption && (
        <div style={{ fontSize: '7.5pt', color: captionColor, marginTop: 3, maxWidth: size }}>
          {qr.caption}
        </div>
      )}
    </div>
  );
}
