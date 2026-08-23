'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';

/** Floating print trigger for public invoice pages — hidden in the printed
 *  output itself via `print:hidden`. Auto-triggers the print dialog when
 *  opened with `?print=1` (the invoice dialog's "Print" action). */
export function PrintButton() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('print') === '1') {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden fixed top-4 end-4 flex items-center gap-2 rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-medium shadow-lg hover:bg-gray-700 transition-colors"
    >
      <Printer className="h-4 w-4" strokeWidth={1.75} />
      Print
    </button>
  );
}
