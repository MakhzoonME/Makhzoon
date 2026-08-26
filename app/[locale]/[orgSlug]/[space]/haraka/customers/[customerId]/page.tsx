'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { CustomerDetailPage } from '@/components/vertical/pages/CustomerDetailPage';

export default function HarakaCustomerDetailPage() {
  return (
    <VerticalProvider vertical="haraka">
      <CustomerDetailPage />
    </VerticalProvider>
  );
}
