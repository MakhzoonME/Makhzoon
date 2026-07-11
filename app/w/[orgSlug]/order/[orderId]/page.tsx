import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadOrderDocument } from '@/lib/modules/haraka/orders/order-document-loader';
import { WarrantyCertificatePublicView } from '@/components/haraka/WarrantyCertificatePublicView';
import type { WarrantyCertificateData } from '@/components/haraka/WarrantyCertificatePreview';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

interface CertPayload {
  vendor: string;
  startDate: string;
  endDate: string;
  notes: string | null;
  terms: string;
  certNumber: string;
  items: Array<{ name: string; quantity: number; sku?: string | null }>;
}

function decodeCertPayload(d: string): CertPayload | null {
  try {
    const json = Buffer.from(d, 'base64').toString('utf-8');
    return JSON.parse(json) as CertPayload;
  } catch {
    return null;
  }
}

export default async function PublicWarrantyPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; orderId: string }>;
  searchParams: Promise<{ d?: string; download?: string }>;
}) {
  const { orgSlug, orderId } = await params;
  const sp = await searchParams;

  const result = await loadOrderDocument(orgSlug, orderId);
  if (!result) notFound();

  const payload = sp.d ? decodeCertPayload(sp.d) : null;
  if (!payload) notFound();

  const certData: WarrantyCertificateData = {
    certificateNumber: payload.certNumber,
    customerName:      result.order.customerName,
    customerPhone:     result.order.customerPhone,
    orderNumber:       result.order.orderNumber,
    issueDate:         new Date().toISOString().slice(0, 10),
    startDate:         payload.startDate,
    endDate:           payload.endDate,
    vendor:            payload.vendor,
    items:             payload.items,
    notes:             payload.notes,
    termsText:         payload.terms,
  };

  return (
    <WarrantyCertificatePublicView
      data={certData}
      orgName={result.ctx.orgName}
      tagline={result.ctx.tagline}
      taxNumber={result.ctx.taxNumber}
      receiptConfig={result.ctx.receiptConfig}
      autoDownload={sp.download === '1'}
    />
  );
}
