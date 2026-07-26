import { createToast, updateToast } from '@/hooks/ui';

/**
 * Client-side export runner. Kicks off a download from an export endpoint and
 * drives a live progress toast (loading → ready/download, or error). Reusable
 * by any export button / future export feature.
 *
 * The server generates the file (e.g. .xlsx) and returns it; this shows an
 * indeterminate "Exporting…" toast until the blob arrives, triggers the
 * download, then flips the toast to success with a "Download again" action.
 */
export interface RunExportArgs {
  /** Export endpoint URL (already carrying any filters / scope). */
  url: string;
  /** Fallback filename (incl. extension) if the server sends none. */
  filename: string;
  /** Human label for the toast, e.g. "assets". */
  label?: string;
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (star?.[1]) { try { return decodeURIComponent(star[1].replace(/"/g, '')); } catch { /* fall through */ } }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1] ?? null;
}

export async function runExport({ url, filename, label }: RunExportArgs): Promise<void> {
  const what = label ?? 'data';
  const id = createToast({
    title: `Exporting ${what}…`,
    description: 'Preparing your file, this may take a moment',
    loading: true,
  });

  try {
    const res = await fetch(url);
    if (!res.ok) {
      let msg = 'Export failed';
      try { msg = (await res.json())?.error ?? msg; } catch { /* non-JSON error */ }
      throw new Error(typeof msg === 'string' ? msg : 'Export failed');
    }

    const blob = await res.blob();
    const finalName = filenameFromDisposition(res.headers.get('Content-Disposition')) ?? filename;
    const objectUrl = URL.createObjectURL(blob);

    const download = () => {
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    download();

    updateToast(id, {
      title: 'Export ready',
      description: `${finalName} downloaded`,
      variant: 'success',
      loading: false,
      action: { label: 'Download again', onClick: download },
    });

    setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
  } catch (err) {
    updateToast(id, {
      title: 'Export failed',
      description: err instanceof Error ? err.message : 'Please try again',
      variant: 'error',
      loading: false,
    });
  }
}
