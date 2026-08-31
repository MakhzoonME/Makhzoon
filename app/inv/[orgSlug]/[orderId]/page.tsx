import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadOrderDocument } from '@/lib/modules/haraka/orders/order-document-loader';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { OrderDocumentPublicView } from '@/components/haraka/OrderDocumentPublicView';
import { publicDocumentBaseUrl } from '@/lib/receipts/public-receipt';
import { documentPublicUrl } from '@/lib/qr';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; orderId: string }>;
  searchParams: Promise<{ type?: string; download?: string }>;
}) {
  const { orgSlug, orderId } = await params;
  const sp = await searchParams;
  const type = sp.type === 'receipt' ? 'receipt' : 'invoice';
  const autoDownload = sp.download === '1';

  const result = await loadOrderDocument(orgSlug, orderId);
  if (!result) notFound();

  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('id, amount, payment_method, note, paid_at')
    .eq('reference_type', 'order')
    .eq('reference_id', orderId)
    .eq('organization_id', result.ctx.orgId)
    .eq('status', 'paid')
    .order('paid_at', { ascending: true });

  // The QR points back at this exact document — keep ?type so a scanned
  // receipt reopens as a receipt, not as the invoice this route defaults to.
  const documentUrl = documentPublicUrl(
    'order', orgSlug, orderId, await publicDocumentBaseUrl(),
    type === 'receipt' ? '?type=receipt' : '',
  );

  return (
    <OrderDocumentPublicView
      type={type as 'invoice' | 'receipt'}
      order={result.order}
      payments={(payments ?? []).map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentMethod: p.payment_method as string | null,
        note: p.note as string | null,
      }))}
      orgName={result.ctx.orgName}
      tagline={result.ctx.tagline}
      taxNumber={result.ctx.taxNumber}
      receiptConfig={result.ctx.receiptConfig}
      docConfig={result.ctx.docConfig}
      documentUrl={documentUrl}
      autoDownload={autoDownload}
    />
  );
}
