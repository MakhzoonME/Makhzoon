'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  renderReceiptRaster,
  type ReceiptPrintText,
  type ReceiptRaster,
} from '@/lib/modules/haraka/printing/receipt-canvas';
import type { ReceiptLang } from '@/lib/receipts/labels';
import type { PosTransaction } from '@/types';

/**
 * Thermal receipt preview — an <img> of the exact 1-bit bitmap the printer
 * receives, not an HTML re-creation of it. `useReceiptRaster` hands the caller
 * the same `ReceiptRaster` back so the Print button can ship the bitmap that is
 * on screen instead of rendering a second, possibly divergent one.
 */

interface RasterArgs {
  transaction: PosTransaction | null;
  text: ReceiptPrintText;
  paperWidth: 58 | 80;
  lang: ReceiptLang;
  currency?: string;
}

export function useReceiptRaster({ transaction, text, paperWidth, lang, currency }: RasterArgs) {
  const [raster, setRaster] = useState<ReceiptRaster | null>(null);
  const [loading, setLoading] = useState(false);
  // Callers rebuild `text` inline every render; key off its content, not identity.
  const textKey = JSON.stringify(text);
  const runIdRef = useRef(0);

  useEffect(() => {
    if (!transaction) { setRaster(null); return; }
    const runId = ++runIdRef.current;
    let alive = true;
    setLoading(true);
    renderReceiptRaster(transaction, { paperWidth, text: JSON.parse(textKey) as ReceiptPrintText, currency }, lang)
      .then((r) => { if (alive && runId === runIdRef.current) setRaster(r); })
      .catch((err) => { console.error('[receipt raster]', err); if (alive) setRaster(null); })
      .finally(() => { if (alive && runId === runIdRef.current) setLoading(false); });
    return () => { alive = false; };
  }, [transaction, textKey, paperWidth, lang, currency]);

  return { raster, loading };
}

interface PreviewProps {
  raster: ReceiptRaster | null;
  loading?: boolean;
  /** CSS px per printer dot. 0.5 renders at 2× density — crisp on any screen. */
  scale?: number;
  className?: string;
}

export function ReceiptRasterPreview({ raster, loading, scale = 0.5, className }: PreviewProps) {
  if (!raster || raster.height === 0) {
    return (
      <div className={className} style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
        {loading
          ? <Loader2 size={18} className="animate-spin text-gray-400" />
          : <span className="text-[11px] text-gray-400">No preview</span>}
      </div>
    );
  }

  return (
    <div className={className} style={{ display: 'flex', justifyContent: 'center' }}>
      {/* The white sheet IS the printable area — no padding, or the preview
          would promise margins the paper does not have. */}
      <div
        style={{
          background: '#fff',
          boxShadow: '0 1px 6px rgba(0,0,0,0.14)',
          width: Math.round(raster.width * scale),
          opacity: loading ? 0.55 : 1,
          transition: 'opacity 120ms linear',
        }}
      >
        <img
          src={raster.dataUrl}
          alt="Receipt preview"
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
      </div>
    </div>
  );
}
