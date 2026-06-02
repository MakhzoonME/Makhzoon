'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { ReceiptPreview, type ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';

interface Props {
  orgName: string;
  taxNumber: string;
  tagline: string;
  config: ReceiptConfig;
}

/* Public, unauthenticated receipt page rendered at /r/[orgSlug]/preview.
   When opened with ?download=1 the browser's print-to-PDF dialog opens
   automatically (used by the "Download PDF" share button). */
export function ReceiptPublicView({ orgName, taxNumber, tagline, config }: Props) {
  const params = useSearchParams();
  const autoDownload = params.get('download') === '1';

  useEffect(() => {
    if (autoDownload) {
      const id = setTimeout(() => window.print(), 400);
      return () => clearTimeout(id);
    }
  }, [autoDownload]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-5 py-10 px-4">
      <ReceiptPreview orgName={orgName} taxNumber={taxNumber} tagline={tagline} config={config} />

      <button
        onClick={() => window.print()}
        className="print:hidden inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
      >
        <Printer size={15} />
        Print / Save as PDF
      </button>
    </div>
  );
}
