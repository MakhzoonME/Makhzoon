'use client';

import { useState } from 'react';
import { Eye, FileText, Loader2 } from 'lucide-react';
import { toast, useT } from '@/hooks/ui';
import type { DocumentRef } from '@/types';

interface Props {
  value: DocumentRef[] | undefined;
  /** Optional heading shown above the list. */
  label?: string;
  /** Message when there are no documents. Pass null to render nothing. */
  emptyText?: string | null;
}

/** Read-only viewer for uploaded documents. Opens public URLs directly and
 *  re-signs private objects on demand. Mirrors DocumentUpload's view behavior
 *  without upload/remove controls. */
export function DocumentList({ value, label, emptyText }: Props) {
  const { t } = useT();
  const [viewing, setViewing] = useState<string | null>(null);
  const docs = value ?? [];

  async function openDoc(ref: DocumentRef) {
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

  if (docs.length === 0) {
    if (emptyText === null) return null;
    return (
      <div>
        {label && <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>}
        <p className="text-sm text-gray-400">{emptyText ?? t('common.noResults')}</p>
      </div>
    );
  }

  const isImage = (r: DocumentRef) => r.contentType.startsWith('image/');

  return (
    <div>
      {label && <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>}
      <div className="space-y-1.5">
        {docs.map((ref) => (
          <button
            key={ref.path}
            type="button"
            onClick={() => openDoc(ref)}
            className="w-full flex items-center gap-2.5 rounded-md border border-border bg-surface-page px-2.5 py-1.5 text-left hover:bg-surface-hover transition-colors"
          >
            <div className="relative h-9 w-9 flex-shrink-0 rounded border border-border bg-white overflow-hidden flex items-center justify-center">
              {ref.public && isImage(ref) && ref.url
                ? <img src={ref.url} alt={ref.name} className="object-cover w-full h-full" />
                : <FileText className="h-4 w-4 text-gray-400" strokeWidth={1.75} />}
            </div>
            <span className="flex-1 min-w-0 truncate text-sm text-gray-700">{ref.name}</span>
            {viewing === ref.path
              ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              : <Eye className="h-4 w-4 text-gray-400" strokeWidth={1.75} />}
          </button>
        ))}
      </div>
    </div>
  );
}
