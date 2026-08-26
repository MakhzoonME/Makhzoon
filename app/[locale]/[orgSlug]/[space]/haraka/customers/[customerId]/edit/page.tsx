'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { EditCustomerPage } from '@/components/vertical/pages/EditCustomerPage';

export default function HarakaEditCustomerPage() {
  return (
    <VerticalProvider vertical="haraka">
      <EditCustomerPage />
    </VerticalProvider>
  );
}
