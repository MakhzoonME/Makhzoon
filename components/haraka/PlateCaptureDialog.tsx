'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X, AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useT } from '@/hooks/ui';

/**
 * Camera snapshot for plate-photo intake. Unlike CameraScannerDialog (live
 * barcode decode loop), this just streams video and lets the receptionist
 * tap Capture to grab one still frame — the frame is handed back as a data
 * URI for the caller to send to the OCR proxy route.
 */

type CamError = 'unsupported' | 'permission' | 'no-camera' | 'generic';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCaptured: (dataUri: string) => void;
}

export function PlateCaptureDialog({ open, onOpenChange, onCaptured }: Props) {
  const { t } = useT();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<CamError | null>(null);
  const [starting, setStarting] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    stop();
    setError(null);
    onOpenChange(false);
  }, [stop, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('unsupported');
      return;
    }
    setStarting(true);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setStarting(false);
      })
      .catch((err: DOMException) => {
        setStarting(false);
        setError(err.name === 'NotAllowedError' ? 'permission'
          : err.name === 'NotFoundError'   ? 'no-camera'
          : 'generic');
      });
    return () => stop();
  }, [open, stop]);

  function handleCapture() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUri = canvas.toDataURL('image/jpeg', 0.85);
    handleClose();
    onCaptured(dataUri);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" /> {t('serviceJobs.capturePlate')}
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white text-sm px-6 text-center">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
              <span>
                {error === 'unsupported' && t('serviceJobs.cameraUnsupported')}
                {error === 'permission'  && t('serviceJobs.cameraPermissionDenied')}
                {error === 'no-camera'   && t('serviceJobs.cameraNotFound')}
                {error === 'generic'     && t('serviceJobs.cameraGenericError')}
              </span>
            </div>
          ) : (
            <>
              {starting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
            <X className="h-4 w-4 me-2" /> {t('common.cancel')}
          </Button>
          <Button type="button" onClick={handleCapture} disabled={!!error || starting} className="flex-1">
            <Camera className="h-4 w-4 me-2" /> {t('serviceJobs.capture')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
