'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { EditCustomerPage } from '@/components/vertical/pages/EditCustomerPage';

export default function ZeyaraEditPatientPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <EditCustomerPage />
    </VerticalProvider>
  );
}
