'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { DocumentReportsListPage } from '@/components/vertical/pages/DocumentReportsListPage';

export default function HarakaDocumentReportsPage() {
  return (
    <VerticalProvider vertical="haraka">
      <DocumentReportsListPage />
    </VerticalProvider>
  );
}
