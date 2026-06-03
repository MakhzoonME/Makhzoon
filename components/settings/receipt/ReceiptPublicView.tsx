'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { ReceiptPreview, type ReceiptConfig, type ReceiptData } from '@/components/settings/receipt/ReceiptPreview';
import type { ReceiptLang } from '@/lib/receipts/labels';

interface Props {
  orgName: string;
  taxNumber: string;
  tagline: string;
  config: ReceiptConfig;
  orgNameAr?: string;
  taglineAr?: string;
  /** Real sale data; omit to render the template with sample data. */
  data?: ReceiptData;
}

/* Public, unauthenticated receipt page rendered at /r/[orgSlug]/...
   When opened with ?download=1 the browser's print-to-PDF dialog opens
   automatically (used by the "Download PDF" share button).

   When the org issues in both languages, the viewer chooses the language
   here (default English) — we never auto-detect from the browser. */
export function ReceiptPublicView({ orgName, taxNumber, tagline, config, orgNameAr, taglineAr, data }: Props) {
  const params = useSearchParams();
  const autoDownload = params.get('download') === '1';

  const showToggle = config.language === 'both';
  const fixedLang: ReceiptLang = config.language === 'ar' ? 'ar' : 'en';
  const [viewerLang, setViewerLang] = useState<ReceiptLang>('en');
  const lang: ReceiptLang = showToggle ? viewerLang : fixedLang;

  useEffect(() => {
    if (autoDownload) {
      const id = setTimeout(() => window.print(), 400);
      return () => clearTimeout(id);
    }
  }, [autoDownload]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-5 py-10 px-4">
      {showToggle && (
        <div className="print:hidden inline-flex rounded-lg border border-gray-300 bg-white p-0.5 shadow-sm">
          {(['en', 'ar'] as const).map((lng) => (
            <button
              key={lng}
              onClick={() => setViewerLang(lng)}
              className={
                'px-4 py-1.5 text-sm font-medium rounded-md transition-colors ' +
                (viewerLang === lng ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900')
              }
            >
              {lng === 'en' ? 'English' : 'العربية'}
            </button>
          ))}
        </div>
      )}

      <ReceiptPreview
        orgName={orgName}
        orgNameAr={orgNameAr}
        taxNumber={taxNumber}
        tagline={tagline}
        taglineAr={taglineAr}
        lang={lang}
        config={config}
        data={data}
      />

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
