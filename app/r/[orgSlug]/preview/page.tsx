import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ReceiptPublicView } from '@/components/settings/receipt/ReceiptPublicView';
import { loadOrgReceiptContext } from '@/lib/receipts/public-receipt';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ orgSlug: string }> },
): Promise<Metadata> {
  const { orgSlug } = await params;
  const ctx = await loadOrgReceiptContext(orgSlug);
  return { title: ctx ? `${ctx.orgName} — Receipt` : 'Receipt' };
}

export default async function ReceiptPreviewPage(
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const { orgSlug } = await params;
  const ctx = await loadOrgReceiptContext(orgSlug);
  if (!ctx) notFound();

  return (
    <ReceiptPublicView
      orgName={ctx.orgName}
      taxNumber={ctx.taxNumber}
      tagline={ctx.tagline}
      config={ctx.config}
    />
  );
}
