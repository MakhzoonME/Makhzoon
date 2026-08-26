'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { NewCustomerPage } from '@/components/vertical/pages/NewCustomerPage';

export default function HarakaNewCustomerPage() {
  return (
    <VerticalProvider vertical="haraka">
      <NewCustomerPage />
    </VerticalProvider>
  );
}
