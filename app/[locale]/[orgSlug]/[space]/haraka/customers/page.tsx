'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { CustomersListPage } from '@/components/vertical/pages/CustomersListPage';

export default function HarakaCustomersPage() {
  return (
    <VerticalProvider vertical="haraka">
      <CustomersListPage />
    </VerticalProvider>
  );
}
