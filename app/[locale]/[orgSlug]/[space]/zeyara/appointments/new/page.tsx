'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { NewAppointmentPage } from '@/components/vertical/pages/NewAppointmentPage';

export default function ZeyaraNewAppointmentPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <NewAppointmentPage />
    </VerticalProvider>
  );
}
