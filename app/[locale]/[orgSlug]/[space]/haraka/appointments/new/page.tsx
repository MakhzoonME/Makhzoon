'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { NewAppointmentPage } from '@/components/vertical/pages/NewAppointmentPage';

export default function HarakaNewAppointmentPage() {
  return (
    <VerticalProvider vertical="haraka">
      <NewAppointmentPage />
    </VerticalProvider>
  );
}
