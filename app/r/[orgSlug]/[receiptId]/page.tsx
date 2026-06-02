import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { ReceiptPublicView } from '@/components/settings/receipt/ReceiptPublicView';
import type { ReceiptData, ReceiptLine } from '@/components/settings/receipt/ReceiptPreview';
import { loadOrgReceiptContext } from '@/lib/receipts/public-receipt';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const CURRENCY = 'JOD';

interface RawLine {
  inventoryItemName?: string;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
}

interface RawFawtara {
  status?: string;
  qrPayload?: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Load a real transaction, validated to belong to the slug's org, as ReceiptData. */
async function loadReceipt(orgSlug: string, receiptId: string) {
  const ctx = await loadOrgReceiptContext(orgSlug);
  if (!ctx) return null;

  // The id is an unguessable UUID — acts as the share capability token.
  const { data: tx } = await supabaseAdmin
    .from('pos_transactions')
    .select('organization_id, items, subtotal, tax_amount, discount_amount, total, status, receipt_number, cashier_name, fawtara, created_at')
    .eq('id', receiptId)
    .maybeSingle();

  if (!tx || tx.organization_id !== ctx.orgId) return null;

  const lines: ReceiptLine[] = (Array.isArray(tx.items) ? (tx.items as RawLine[]) : []).map((l) => ({
    name: l.inventoryItemName ?? 'Item',
    qty: Number(l.quantity ?? 0),
    unitPrice: Number(l.unitPrice ?? 0),
    lineTotal: Number(l.lineTotal ?? 0),
  }));

  const fawtara = (tx.fawtara ?? null) as RawFawtara | null;
  let qrCodeDataUrl: string | null = null;
  if (fawtara?.status === 'submitted' && fawtara.qrPayload) {
    qrCodeDataUrl = await QRCode.toDataURL(fawtara.qrPayload, { margin: 1, width: 160 });
  }

  const data: ReceiptData = {
    receiptNumber: (tx.receipt_number as string) ?? receiptId.slice(0, 8),
    dateLabel: formatDate(tx.created_at as string),
    cashierName: (tx.cashier_name as string) ?? '',
    lines,
    subtotal: Number(tx.subtotal ?? 0),
    tax: Number(tx.tax_amount ?? 0),
    discount: Number(tx.discount_amount ?? 0),
    total: Number(tx.total ?? 0),
    currency: CURRENCY,
    status: (tx.status as ReceiptData['status']) ?? 'completed',
    qrCodeDataUrl,
  };

  return { ctx, data };
}

export async function generateMetadata(
  { params }: { params: Promise<{ orgSlug: string; receiptId: string }> },
): Promise<Metadata> {
  const { orgSlug, receiptId } = await params;
  const res = await loadReceipt(orgSlug, receiptId);
  return {
    title: res ? `${res.ctx.orgName} — Receipt #${res.data.receiptNumber}` : 'Receipt',
    robots: { index: false, follow: false },
  };
}

export default async function ReceiptPage(
  { params }: { params: Promise<{ orgSlug: string; receiptId: string }> },
) {
  const { orgSlug, receiptId } = await params;
  const res = await loadReceipt(orgSlug, receiptId);
  if (!res) notFound();

  return (
    <ReceiptPublicView
      orgName={res.ctx.orgName}
      taxNumber={res.ctx.taxNumber}
      tagline={res.ctx.tagline}
      config={res.ctx.config}
      data={res.data}
    />
  );
}
