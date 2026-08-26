'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';
import type { DocumentQrConfig, DocumentQrSource } from '@/lib/qr';

interface Props {
  /** Current QR settings for ONE document type. */
  value: Partial<DocumentQrConfig>;
  onChange: (patch: Partial<DocumentQrConfig>) => void;
  /** Card heading — names the document this governs. */
  title?: string;
  /** Extra line under the heading, e.g. which documents are affected. */
  hint?: string;
}

const OPTIONS: Array<{ id: DocumentQrSource; label: string; desc: string }> = [
  { id: 'none',       label: 'No QR code',    desc: 'Nothing is printed.' },
  { id: 'link',       label: 'Document link', desc: 'Scanning opens this document online.' },
  { id: 'compliance', label: 'Fawtara / e-invoicing', desc: 'Uses the tax authority payload.' },
];

/**
 * QR source picker for one document type. Each document keeps its own choice,
 * so an org can put a link QR on customer receipts while invoices carry the
 * e-invoicing payload (or nothing).
 */
export function DocumentQrCard({ value, onChange, title = 'QR code', hint }: Props) {
  const source = value.qrSource ?? 'none';

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
          {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
        </div>

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
