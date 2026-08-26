'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { CustomersListPage } from '@/components/vertical/pages/CustomersListPage';

export default function ZeyaraPatientsPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <CustomersListPage />
    </VerticalProvider>
  );
}
