'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { AppointmentDetailPage } from '@/components/vertical/pages/AppointmentDetailPage';

export default function ZeyaraAppointmentDetailPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <AppointmentDetailPage />
    </VerticalProvider>
  );
}
