'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { CustomerFieldsPage } from '@/components/vertical/pages/CustomerFieldsPage';

export default function HarakaCustomerFieldsPage() {
  return (
    <VerticalProvider vertical="haraka">
      <CustomerFieldsPage />
    </VerticalProvider>
  );
}
