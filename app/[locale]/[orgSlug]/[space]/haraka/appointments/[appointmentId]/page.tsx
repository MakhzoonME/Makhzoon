'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { AppointmentDetailPage } from '@/components/vertical/pages/AppointmentDetailPage';

export default function HarakaAppointmentDetailPage() {
  return (
    <VerticalProvider vertical="haraka">
      <AppointmentDetailPage />
    </VerticalProvider>
  );
}
