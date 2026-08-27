'use client';

import { VerticalProvider } from '@/components/vertical/VerticalProvider';
import { AppointmentsListPage } from '@/components/vertical/pages/AppointmentsListPage';

export default function ZeyaraAppointmentsPage() {
  return (
    <VerticalProvider vertical="zeyara">
      <AppointmentsListPage />
    </VerticalProvider>
  );
}
