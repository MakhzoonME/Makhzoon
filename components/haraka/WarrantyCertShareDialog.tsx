'use client';

import { useRef, useState } from 'react';
import { toPng, toJpeg } from 'html-to-image';
import { Copy, Check, Mail, Download, Printer, ShieldCheck, FileImage, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogIconHeader, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WarrantyCertPreview, type CertLang } from '@/components/haraka/WarrantyCertPreview';
import { cn } from '@/lib/utils/cn';
import { toast } from '@/hooks/ui';
import type { HarakaWarrantyCert, HarakaWarrantyConfig } from '@/types';

function WhatsAppIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.207zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cert: HarakaWarrantyCert | null;
  orgSlug: string;
  orgName: string;
  orgNameAr?: string;
  config: HarakaWarrantyConfig;
  certBaseUrl: string; // e.g. https://app.makhzoon.me
}

export function WarrantyCertShareDialog({
  open, onOpenChange, cert, orgSlug, orgName, orgNameAr, config, certBaseUrl,
}: Props) {
  const [copied, setCopied]       = useState(false);
  const [capturing, setCapturing] = useState<'png' | 'jpg' | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const bothLangs  = config.language === 'both';
  const fixedLang: CertLang = config.language === 'ar' ? 'ar' : 'en';
  const [previewLang, setPreviewLang] = useState<CertLang>(fixedLang);
  const lang = bothLangs ? previewLang : fixedLang;

  const shareLink = cert ? `${certBaseUrl}/w/${orgSlug}/cert/${cert.id}` : '';

  function copyLink() {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      toast.success('Certificate link copied');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error('Could not copy link'));
  }

  async function downloadImage(format: 'png' | 'jpg') {
    const node = captureRef.current;
    if (!node || !cert) return;
    setCapturing(format);
    try {
      const opts = { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' };
      const dataUrl = format === 'png'
        ? await toPng(node, opts)
        : await toJpeg(node, { ...opts, quality: 0.95 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `warranty-${cert.warrantyNumber}.${format}`;
      a.click();
    } catch {
      toast.error('Could not generate image');
    } finally {
      setCapturing(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px]">
        <DialogIconHeader
          icon={<ShieldCheck size={18} />}
          title={`Warranty ${cert?.warrantyNumber ?? ''}`}
        />

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

          {/* Certificate preview */}
          <div
            className="rounded-xl overflow-hidden border border-border p-4 max-h-[44vh] overflow-y-auto"
            style={{ background: 'repeating-linear-gradient(45deg,#f4f4f4,#f4f4f4 6px,#fafafa 6px,#fafafa 12px)' }}
          >
            <div className="flex justify-center">
              <div style={{ transform: 'scale(0.62)', transformOrigin: 'top left', width: 640 }}>
                <div ref={captureRef} style={{ display: 'inline-block', background: '#fff' }}>
                  {cert && (
                    <WarrantyCertPreview
                      cert={cert}
                      config={config}
                      orgName={orgName}
                      orgNameAr={orgNameAr}
                      lang={lang}
                    />
                  )}
                </div>
              </div>
            </div>
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
              onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent('Your Warranty Certificate')}&body=${encodeURIComponent(shareLink)}`; }}>
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
                disabled={capturing !== null}
                onClick={() => downloadImage('png')}>
                {capturing === 'png' ? <Loader2 size={13} className="animate-spin" /> : <FileImage size={13} />}PNG
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                disabled={capturing !== null}
                onClick={() => downloadImage('jpg')}>
                {capturing === 'jpg' ? <Loader2 size={13} className="animate-spin" /> : <FileImage size={13} />}JPG
              </Button>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
