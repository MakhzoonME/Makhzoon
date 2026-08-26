'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { AnalyticsPage } from '@/components/vertical/pages/AnalyticsPage';

export default function HarakaAnalyticsPage() {
  return (
    <VerticalProvider vertical="haraka">
      <AnalyticsPage />
    </VerticalProvider>
  );
}
