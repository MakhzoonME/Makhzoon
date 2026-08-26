import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadAppointmentDocument } from '@/lib/modules/haraka/appointments/appointment-document-loader';
import { AppointmentInvoicePreview } from '@/components/haraka/AppointmentInvoicePreview';
import { PrintButton } from '@/components/haraka/PrintButton';
import { publicDocumentBaseUrl } from '@/lib/receipts/public-receipt';
import { documentPublicUrl } from '@/lib/qr';

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

  // The QR on the printed page points back at this page.
  const documentUrl = documentPublicUrl(
    'appointment', orgSlug, appointmentId, await publicDocumentBaseUrl(),
  );

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white flex items-start justify-center p-6 print:p-0">
      <PrintButton />
      <AppointmentInvoicePreview
        appointment={result.appointment}
        orgName={result.ctx.orgName}
        tagline={result.ctx.tagline}
        taxNumber={result.ctx.taxNumber}
        receiptConfig={result.ctx.receiptConfig}
        docConfig={result.ctx.docConfig}
        documentUrl={documentUrl}
      />
    </div>
  );
}
