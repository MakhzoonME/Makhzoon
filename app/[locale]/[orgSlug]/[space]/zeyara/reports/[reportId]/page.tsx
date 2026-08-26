'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { DocumentReportDetailPage } from '@/components/vertical/pages/DocumentReportDetailPage';

export default function ZeyaraDocumentReportDetailPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <DocumentReportDetailPage />
    </VerticalProvider>
  );
}
