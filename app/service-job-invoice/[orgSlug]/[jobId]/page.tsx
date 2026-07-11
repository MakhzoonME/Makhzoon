import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadServiceJobDocument } from '@/lib/modules/haraka/service-jobs/service-job-document-loader';
import { ServiceJobInvoicePreview } from '@/components/haraka/ServiceJobInvoicePreview';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PublicServiceJobInvoicePage({
  params,
}: {
  params: Promise<{ orgSlug: string; jobId: string }>;
}) {
  const { orgSlug, jobId } = await params;

  const result = await loadServiceJobDocument(orgSlug, jobId);
  if (!result) notFound();

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center p-6">
      <ServiceJobInvoicePreview
        job={result.job}
        orgName={result.ctx.orgName}
        tagline={result.ctx.tagline}
        taxNumber={result.ctx.taxNumber}
        receiptConfig={result.ctx.receiptConfig}
        docConfig={result.ctx.docConfig}
      />
    </div>
  );
}
