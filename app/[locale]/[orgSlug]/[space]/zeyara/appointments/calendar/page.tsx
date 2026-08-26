'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { AppointmentsCalendarPage } from '@/components/vertical/pages/AppointmentsCalendarPage';

export default function ZeyaraAppointmentsCalendarPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <AppointmentsCalendarPage />
    </VerticalProvider>
  );
}
