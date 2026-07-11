'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X, AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useT } from '@/hooks/ui';

/**
 * Camera barcode scanner for POS on phones/tablets that lack a physical
 * scanner. Uses the native Barcode Detection API (Chromium) — no extra
 * dependency. On a successful read it calls onDetected(code) and closes;
 * every failure mode (unsupported, permission denied, no camera, timeout)
 * surfaces a distinct, localized message so the cashier knows what to do.
 */

type ScanError = 'unsupported' | 'permission' | 'no-camera' | 'timeout' | 'generic';

const SCAN_FORMATS = [
  'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93',
  'codabar', 'itf', 'qr_code', 'data_matrix',
];
const TIMEOUT_MS = 30_000;

export function isCameraScanSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'BarcodeDetector' in window &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
}

export function CameraScannerDialog({ open, onOpenChange, onDetected }: Props) {
  const { t } = useT();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectingRef = useRef(false);
  const [error, setError] = useState<ScanError | null>(null);
  const [starting, setStarting] = useState(false);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    rafRef.current = null;
    timeoutRef.current = null;
    detectingRef.current = false;
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    stop();
    onOpenChange(false);
  }, [stop, onOpenChange]);

  const start = useCallback(async () => {
    setError(null);
    if (!isCameraScanSupported()) {
      setError('unsupported');
      return;
    }
    setStarting(true);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
    } catch (err) {
      setStarting(false);
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') setError('permission');
      else if (name === 'NotFoundError' || name === 'OverconstrainedError') setError('no-camera');
      else setError('generic');
      return;
    }

    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) {
      stop();
      return;
    }
    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      /* autoplay can reject on some browsers; the loop still reads frames */
    }
    setStarting(false);

    const detector = new window.BarcodeDetector!({ formats: SCAN_FORMATS });
    detectingRef.current = true;

    timeoutRef.current = setTimeout(() => {
      if (detectingRef.current) {
        stop();
        setError('timeout');
      }
    }, TIMEOUT_MS);

    const tick = async () => {
      if (!detectingRef.current || !videoRef.current) return;
      try {
        const results = await detector.detect(videoRef.current);
        const hit = results.find((r) => r.rawValue?.trim());
        if (hit) {
          const code = hit.rawValue.trim();
          stop();
          onDetected(code);
          onOpenChange(false);
          return;
        }
      } catch {
        /* transient decode error — keep scanning */
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stop, onDetected, onOpenChange]);

  // Start when opened, tear down when closed/unmounted.
  useEffect(() => {
    if (open) start();
    return stop;
    // start/stop are stable; re-run only on open toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const errorMessage = error
    ? {
        unsupported: t('scanner.errUnsupported'),
        permission: t('scanner.errPermission'),
        'no-camera': t('scanner.errNoCamera'),
        timeout: t('scanner.errTimeout'),
        generic: t('scanner.errGeneric'),
      }[error]
    : null;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera size={18} aria-hidden /> {t('scanner.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
            aria-label={t('scanner.title')}
          />

          {/* Reticle */}
          {!error && !starting && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="h-2/3 w-2/3 rounded-lg border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          )}

          {starting && (
            <div className="absolute inset-0 grid place-items-center text-white">
              <Loader2 className="animate-spin" size={28} aria-hidden />
            </div>
          )}

          {errorMessage && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center">
              <div className="space-y-3 text-white">
                <AlertTriangle className="mx-auto text-amber-400" size={28} aria-hidden />
                <p className="text-sm">{errorMessage}</p>
                {error !== 'unsupported' && (
                  <Button size="sm" variant="secondary" onClick={start}>
                    {t('scanner.retry')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500">{t('scanner.hint')}</p>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleClose} className="gap-1.5">
            <X size={14} aria-hidden /> {t('common.cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
