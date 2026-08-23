import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadAppointmentDocument } from '@/lib/modules/haraka/appointments/appointment-document-loader';
import { AppointmentInvoicePreview } from '@/components/haraka/AppointmentInvoicePreview';
import { PrintButton } from '@/components/haraka/PrintButton';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PublicAppointmentInvoicePage({
  params,
}: {
  params: Promise<{ orgSlug: string; appointmentId: string }>;
}) {
  const { orgSlug, appointmentId } = await params;

  const result = await loadAppointmentDocument(orgSlug, appointmentId);
  if (!result) notFound();

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white flex items-start justify-center p-6 print:p-0">
      <PrintButton />
      <AppointmentInvoicePreview
        appointment={result.appointment}
        orgName={result.ctx.orgName}
        tagline={result.ctx.tagline}
        taxNumber={result.ctx.taxNumber}
        receiptConfig={result.ctx.receiptConfig}
      />
    </div>
  );
}
