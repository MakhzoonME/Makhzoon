'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { DocumentReportsListPage } from '@/components/vertical/pages/DocumentReportsListPage';

export default function ZeyaraDocumentReportsPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <DocumentReportsListPage />
    </VerticalProvider>
  );
}
