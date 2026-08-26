'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { ProvidersPage } from '@/components/vertical/pages/ProvidersPage';

export default function HarakaStaffPage() {
  return (
    <VerticalProvider vertical="haraka">
      <ProvidersPage />
    </VerticalProvider>
  );
}
