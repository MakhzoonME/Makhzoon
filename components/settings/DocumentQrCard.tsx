'use client';

import { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/ui';
import { Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type {
  DocumentQrConfig,
  DocumentQrSource,
  DocumentQrTarget,
  QrPositionA4,
  QrPositionThermal,
} from '@/lib/qr';

interface Props {
  /** Current QR settings for ONE document type. */
  value: Partial<DocumentQrConfig>;
  onChange: (patch: Partial<DocumentQrConfig>) => void;
  /** Card heading — names the document this governs. */
  title?: string;
  /** Extra line under the heading, e.g. which documents are affected. */
  hint?: string;
  /**
   * Which position picker to show — 'a4' for corner placement (order/
   * service-job/appointment invoices, reports, warranty certs, and receipts
   * on an a4-* template), 'thermal' for top/bottom (receipts/warranty certs
   * on a thermal-* template), 'none' to hide it entirely. Defaults to 'a4'.
   */
  positionMode?: 'a4' | 'thermal' | 'none';
  /**
   * Reports and warranty certs have no "physical original" a custom link or
   * uploaded file makes sense for — pass true to hide the target picker and
   * always encode the document's own link. Defaults to false.
   */
  lockTarget?: boolean;
}

const OPTIONS: Array<{ id: DocumentQrSource; label: string; desc: string }> = [
  { id: 'none',       label: 'No QR code',    desc: 'Nothing is printed.' },
  { id: 'link',       label: 'Document link', desc: 'Scanning opens this document online.' },
  { id: 'compliance', label: 'Fawtara / e-invoicing', desc: 'Uses the tax authority payload.' },
];

const TARGETS: Array<{ id: DocumentQrTarget; label: string; desc: string }> = [
  { id: 'self',           label: "This document's own link", desc: 'The default — a customer scans it and sees this exact document.' },
  { id: 'custom-link',    label: 'A custom link',             desc: 'One fixed URL for every document of this type (e.g. your menu or website).' },
  { id: 'uploaded-file',  label: 'An uploaded file',          desc: 'A PDF or image you upload — the QR opens it directly.' },
];

const A4_POSITIONS: Array<{ id: QrPositionA4; label: string }> = [
  { id: 'top-left',     label: 'Top left' },
  { id: 'top-right',    label: 'Top right' },
  { id: 'bottom-left',  label: 'Bottom left' },
  { id: 'bottom-right', label: 'Bottom right' },
];

const THERMAL_POSITIONS: Array<{ id: QrPositionThermal; label: string; desc: string }> = [
  { id: 'top',    label: 'Top',    desc: 'Before the header/logo.' },
  { id: 'bottom', label: 'Bottom', desc: 'After the totals, before the footer.' },
];

/**
 * QR source/target/position picker for one document type. Each document
 * keeps its own choice, so an org can put a link QR on customer receipts
 * while invoices carry the e-invoicing payload (or nothing).
 */
export function DocumentQrCard({
  value, onChange, title = 'QR code', hint, positionMode = 'a4', lockTarget = false,
}: Props) {
  const source = value.qrSource ?? 'none';
  const target = value.qrTarget ?? 'self';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'qr-target-file');
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Upload failed');
      }
      const data = (await res.json()) as { url: string };
      onChange({ qrUploadedFileUrl: data.url });
      toast.success('File uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
          {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
        </div>

        {/* Always visible — doubles as the on/off toggle for this document's QR. */}
        <div className="space-y-2">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange({ qrSource: o.id })}
              className={cn(
                'w-full flex flex-col items-start gap-0.5 rounded-lg border p-3 text-start transition-all',
                source === o.id
                  ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600'
                  : 'border-border bg-surface-page hover:border-gray-300',
              )}
            >
              <span className="text-xs font-semibold text-gray-800">{o.label}</span>
              <span className="text-[11px] text-gray-400">{o.desc}</span>
            </button>
          ))}
        </div>

        {source === 'compliance' && (
          // Being explicit beats a QR that silently is not what the setting says.
          <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-[11px] text-orange-700">
            No e-invoicing provider is connected yet, so these documents will show
            the document link instead. The QR switches over on its own once Fawtara
            is enabled — no need to come back here.
          </div>
        )}

        {source === 'link' && !lockTarget && (
          <div className="space-y-2 pt-1">
            <Label>Links to</Label>
            {TARGETS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange({ qrTarget: t.id })}
                className={cn(
                  'w-full flex flex-col items-start gap-0.5 rounded-lg border p-2.5 text-start transition-all',
                  target === t.id
                    ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600'
                    : 'border-border bg-surface-page hover:border-gray-300',
                )}
              >
                <span className="text-xs font-semibold text-gray-800">{t.label}</span>
                <span className="text-[11px] text-gray-400">{t.desc}</span>
              </button>
            ))}

            {target === 'custom-link' && (
              <Input
                value={value.qrCustomLink ?? ''}
                onChange={(e) => onChange({ qrCustomLink: e.target.value })}
                placeholder="https://example.com/menu"
                type="url"
              />
            )}

            {target === 'uploaded-file' && (
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  <span className="ms-1">{uploading ? 'Uploading…' : value.qrUploadedFileUrl ? 'Replace file' : 'Upload file'}</span>
                </Button>
                {value.qrUploadedFileUrl && (
                  <a href={value.qrUploadedFileUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary-600 hover:underline truncate max-w-[160px]">
                    View current file
                  </a>
                )}
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleFileUpload} />
              </div>
            )}
          </div>
        )}

        {source !== 'none' && positionMode === 'a4' && (
          <div className="space-y-1.5 pt-1">
            <Label>Position on the page</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {A4_POSITIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange({ qrPositionA4: p.id })}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-xs text-start transition-all',
                    (value.qrPositionA4 ?? 'bottom-right') === p.id
                      ? 'border-primary-600 bg-primary-50 text-primary-700 ring-1 ring-primary-600'
                      : 'border-border bg-surface-page text-gray-600 hover:border-gray-300',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {source !== 'none' && positionMode === 'thermal' && (
          <div className="space-y-1.5 pt-1">
            <Label>Position on the roll</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {THERMAL_POSITIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange({ qrPositionThermal: p.id })}
                  className={cn(
                    'flex flex-col items-start gap-0.5 rounded-lg border px-2.5 py-1.5 text-start transition-all',
                    (value.qrPositionThermal ?? 'bottom') === p.id
                      ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600'
                      : 'border-border bg-surface-page hover:border-gray-300',
                  )}
                >
                  <span className="text-xs font-semibold text-gray-800">{p.label}</span>
                  <span className="text-[10px] text-gray-400">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {source !== 'none' && (
          <div className="space-y-1.5 pt-1">
            <Label>Caption (optional)</Label>
            <Input
              value={value.qrCaption ?? ''}
              onChange={(e) => onChange({ qrCaption: e.target.value })}
              placeholder="e.g. Scan for your receipt"
              maxLength={60}
            />
            <p className="text-[11px] text-gray-400">Printed directly under the QR code.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
