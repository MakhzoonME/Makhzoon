import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOrganizationBySubdomain } from '@/lib/db/organizations';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ReceiptPublicView } from '@/components/settings/receipt/ReceiptPublicView';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';

export const dynamic = 'force-dynamic';

const DEFAULT_CONFIG: ReceiptConfig = {
  template: 'thermal-58',
  showLogo: true,
  showTaxNumber: true,
  showCashier: true,
  showFawtaraQr: true,
  showItemizedTax: true,
  showAddress: true,
  showPhone: true,
  showWebsite: false,
  footerText: 'Thank you for your purchase!',
  accentColor: '#1d4ed8',
  logo: null,
  phone: '',
  address: '',
  website: '',
};

interface SavedReceipt {
  tagline?: string;
  taxNumber?: string;
  config?: Partial<ReceiptConfig>;
}

async function loadReceipt(orgSlug: string) {
  const org = await getOrganizationBySubdomain(orgSlug);
  if (!org) return null;

  const { data } = await supabaseAdmin
    .from('organization_configs')
    .select('receipt_config')
    .eq('organization_id', org.id)
    .maybeSingle();

  const saved = (data?.receipt_config ?? {}) as SavedReceipt;
  return {
    orgName: org.name,
    tagline: saved.tagline ?? '',
    taxNumber: saved.taxNumber ?? '',
    config: { ...DEFAULT_CONFIG, ...(saved.config ?? {}) },
  };
}

export async function generateMetadata(
  { params }: { params: Promise<{ orgSlug: string }> },
): Promise<Metadata> {
  const { orgSlug } = await params;
  const data = await loadReceipt(orgSlug);
  return { title: data ? `${data.orgName} — Receipt` : 'Receipt' };
}

export default async function ReceiptPreviewPage(
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const { orgSlug } = await params;
  const data = await loadReceipt(orgSlug);
  if (!data) notFound();

  return (
    <ReceiptPublicView
      orgName={data.orgName}
      taxNumber={data.taxNumber}
      tagline={data.tagline}
      config={data.config}
    />
  );
}
