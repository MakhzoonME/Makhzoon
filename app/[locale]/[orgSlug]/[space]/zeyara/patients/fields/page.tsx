'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { CustomerFieldsPage } from '@/components/vertical/pages/CustomerFieldsPage';

export default function ZeyaraPatientFieldsPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <CustomerFieldsPage />
    </VerticalProvider>
  );
}
