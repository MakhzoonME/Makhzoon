'use client';
import { X } from 'lucide-react';
import { useT } from '@/hooks/ui';
import { cn } from '@/lib/utils/cn';

interface Props {
  /** Number of currently-selected rows. Bar hides when 0. */
  count: number;
  /** Called when the user clears the selection (X button). */
  onClear: () => void;
  /** Action buttons rendered on the trailing edge. */
  children: React.ReactNode;
  /** Optional custom label override; defaults to `bulk.selected`. */
  label?: string;
}

/**
 * Floating bulk-actions toolbar that pins itself to the bottom of the viewport
 * once at least one row is selected. Used across the list pages (assets,
 * inventory, requests, customers).
 */
export function BulkActionsBar({ count, onClear, children, label }: Props) {
  const { t, dir } = useT();
  const isRtl = dir === 'rtl';
  if (count <= 0) return null;
  const shown = label ?? t('bulk.selected').replace('{count}', String(count));

  return (
    <div
      className={cn(
        'fixed bottom-6 z-40 -translate-x-1/2 left-1/2 max-w-[calc(100vw-2rem)]',
        'flex items-center gap-3 px-4 py-2.5 rounded-full bg-gray-900/95 text-white shadow-lg backdrop-blur',
      )}
      role="region"
      aria-label={t('bulk.selected').replace('{count}', String(count))}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <button
        type="button"
        onClick={onClear}
        className="h-7 w-7 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 transition-colors flex-shrink-0"
        aria-label={t('common.clear')}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <span className="text-sm font-medium whitespace-nowrap">{shown}</span>
      <div className="h-5 w-px bg-white/20 flex-shrink-0" />
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
