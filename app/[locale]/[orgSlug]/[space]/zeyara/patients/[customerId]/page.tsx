'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { CustomerDetailPage } from '@/components/vertical/pages/CustomerDetailPage';

export default function ZeyaraPatientDetailPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <CustomerDetailPage />
    </VerticalProvider>
  );
}
