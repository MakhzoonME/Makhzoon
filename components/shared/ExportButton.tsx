'use client';
import { ChevronDown } from 'lucide-react';
import { useT } from '@/hooks/ui';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { runExport } from '@/lib/export/run-export';

function DownloadSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

interface ExportButtonProps {
  /** Base filename without extension, e.g. "assets" (a date + extension are appended). */
  filename: string;
  /** Build the export URL for a scope. 'filtered' = current page filters, 'all' = everything. */
  getUrl: (scope: 'filtered' | 'all') => string;
  /** Human dataset label used in the toast (e.g. "assets"). Defaults to filename. */
  label?: string;
  /** Button text (defaults to "Export"). */
  buttonLabel?: string;
  /** File extension for the fallback filename (default "xlsx"). */
  ext?: string;
  /** Show the filtered "Export" item (hide when the page has no filters). Default true. */
  showFiltered?: boolean;
  disabled?: boolean;
}

export function ExportButton({
  filename,
  getUrl,
  label,
  buttonLabel,
  ext = 'xlsx',
  showFiltered = true,
  disabled,
}: ExportButtonProps) {
  const { t } = useT();
  const stamp = new Date().toISOString().slice(0, 10);

  function fire(scope: 'filtered' | 'all') {
    runExport({ url: getUrl(scope), filename: `${filename}-${stamp}.${ext}`, label: label ?? filename });
  }

  // No filters on the page → a single "Export All" button (no menu needed).
  if (!showFiltered) {
    return (
      <Button variant="outline" size="sm" onClick={() => fire('all')} disabled={disabled}>
        <DownloadSVG />
        {buttonLabel ?? t('common.export')}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-1.5">
          <DownloadSVG />
          {buttonLabel ?? t('common.export')}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuItem onClick={() => fire('filtered')} className="cursor-pointer">
          <div className="flex flex-col">
            <span className="text-sm">{t('export.currentView')}</span>
            <span className="text-[11px] text-gray-400">{t('export.currentViewHint')}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => fire('all')} className="cursor-pointer">
          <div className="flex flex-col">
            <span className="text-sm">{t('export.all')}</span>
            <span className="text-[11px] text-gray-400">{t('export.allHint')}</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
