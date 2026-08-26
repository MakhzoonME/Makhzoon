'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { AnalyticsPage } from '@/components/vertical/pages/AnalyticsPage';

export default function ZeyaraAnalyticsPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <AnalyticsPage />
    </VerticalProvider>
  );
}
