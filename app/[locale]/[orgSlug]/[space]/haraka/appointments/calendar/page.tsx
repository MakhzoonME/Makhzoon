'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { AppointmentsCalendarPage } from '@/components/vertical/pages/AppointmentsCalendarPage';

export default function HarakaAppointmentsCalendarPage() {
  return (
    <VerticalProvider vertical="haraka">
      <AppointmentsCalendarPage />
    </VerticalProvider>
  );
}
