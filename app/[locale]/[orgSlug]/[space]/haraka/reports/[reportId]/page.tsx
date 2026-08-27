'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { DocumentReportDetailPage } from '@/components/vertical/pages/DocumentReportDetailPage';

export default function HarakaDocumentReportDetailPage() {
  return (
    <VerticalProvider vertical="haraka">
      <DocumentReportDetailPage />
    </VerticalProvider>
  );
}
