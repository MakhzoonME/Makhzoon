'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { ProvidersPage } from '@/components/vertical/pages/ProvidersPage';

export default function ZeyaraProvidersPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <ProvidersPage />
    </VerticalProvider>
  );
}
