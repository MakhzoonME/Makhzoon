'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { AppointmentsListPage } from '@/components/vertical/pages/AppointmentsListPage';

export default function HarakaAppointmentsPage() {
  return (
    <VerticalProvider vertical="haraka">
      <AppointmentsListPage />
    </VerticalProvider>
  );
}
