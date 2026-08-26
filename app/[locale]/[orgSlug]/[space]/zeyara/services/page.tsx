'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { ServiceCatalogPage } from '@/components/vertical/pages/ServiceCatalogPage';

export default function ZeyaraServiceCatalogPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <ServiceCatalogPage />
    </VerticalProvider>
  );
}
