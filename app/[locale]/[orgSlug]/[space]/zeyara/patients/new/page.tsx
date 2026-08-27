'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { NewCustomerPage } from '@/components/vertical/pages/NewCustomerPage';

export default function ZeyaraNewPatientPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <NewCustomerPage />
    </VerticalProvider>
  );
}
