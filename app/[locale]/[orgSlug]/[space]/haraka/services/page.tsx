'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { ServiceCatalogPage } from '@/components/vertical/pages/ServiceCatalogPage';

export default function HarakaServiceCatalogPage() {
  return (
    <VerticalProvider vertical="haraka">
      <ServiceCatalogPage />
    </VerticalProvider>
  );
}
