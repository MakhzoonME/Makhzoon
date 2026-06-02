'use client';

import { useRef, useState } from 'react';
import { Upload, X, Eye, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast, useT } from '@/hooks/ui';
import { cn } from '@/lib/utils/cn';
import type { DocumentRef } from '@/types';

/** Persisted reference to an uploaded file. Store this array on the entity. */
export type DocRef = DocumentRef;

interface Props {
  /** Upload kind → maps to a bucket server-side. */
  kind: 'avatar' | 'logo' | 'asset-receipt' | 'inventory-receipt' | 'warranty-document' | 'purchase-invoice';
  value: DocRef[];
  onChange: (refs: DocRef[]) => void;
  multiple?: boolean;
  label?: string;
  /** Accept override (defaults to images + pdf). */
  accept?: string;
  disabled?: boolean;
}

const DEFAULT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

export function DocumentUpload({
  kind, value, onChange, multiple = true, label, accept = DEFAULT_ACCEPT, disabled,
}: Props) {
  const { t } = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;

    setUploading(true);
    try {
      const uploaded: DocRef[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        form.append('type', kind);
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? 'Upload failed');
        }
        const d = (await res.json()) as { bucket: string; path: string; name: string; url: string; public: boolean };
        uploaded.push({ bucket: d.bucket, path: d.path, name: d.name, url: d.url, public: d.public, contentType: file.type });
      }
      onChange(multiple ? [...value, ...uploaded] : uploaded.slice(-1));
      toast.success(t('common.updated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.updateFailed'));
    } finally {
      setUploading(false);
    }
  }

  async function openDoc(ref: DocRef) {
    // Public buckets: open the stable URL directly. Private: fetch a fresh signed URL.
    if (ref.public && ref.url) { window.open(ref.url, '_blank'); return; }
    setViewing(ref.path);
    try {
      const res = await fetch(`/api/storage/sign?bucket=${encodeURIComponent(ref.bucket)}&path=${encodeURIComponent(ref.path)}`);
      if (!res.ok) throw new Error();
      const { url } = (await res.json()) as { url: string };
      window.open(url, '_blank');
    } catch {
      toast.error(t('common.updateFailed'));
    } finally {
      setViewing(null);
    }
  }

  function remove(path: string) {
    onChange(value.filter((r) => r.path !== path));
  }

  const isImage = (r: DocRef) => r.contentType.startsWith('image/');

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-medium text-gray-600">{label}</label>}

      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((ref) => (
            <div key={ref.path} className="flex items-center gap-2.5 rounded-md border border-border bg-surface-page px-2.5 py-1.5">
              <div className="h-9 w-9 flex-shrink-0 rounded border border-border bg-white overflow-hidden flex items-center justify-center">
                {ref.public && isImage(ref) && ref.url
                  ? <img src={ref.url} alt={ref.name} className="h-full w-full object-cover" />
                  : <FileText className="h-4 w-4 text-gray-400" strokeWidth={1.75} />}
              </div>
              <span className="flex-1 min-w-0 truncate text-sm text-gray-700">{ref.name}</span>
              <button type="button" onClick={() => openDoc(ref)} disabled={disabled}
                className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors" aria-label="View">
                {viewing === ref.path ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
              </button>
              <button type="button" onClick={() => remove(ref.path)} disabled={disabled}
                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" aria-label="Remove">
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          ))}
        </div>
      )}

      {(multiple || value.length === 0) && (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading || disabled}
          className={cn('gap-1.5', uploading && 'opacity-70')}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />}
          {uploading ? t('common.saving') : t('common.add')}
        </Button>
      )}

      <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden" onChange={handleFiles} />
    </div>
  );
}
