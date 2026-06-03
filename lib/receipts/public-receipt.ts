import { getOrganizationBySubdomain } from '@/lib/db/organizations';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import { DEFAULT_RECEIPT_CONFIG } from '@/lib/receipts/receipt-config';

/* Server-side loaders for the public, unauthenticated receipt pages
   (/r/[orgSlug]/...). Shared by the template preview and real receipts. */

export { DEFAULT_RECEIPT_CONFIG };

export interface OrgReceiptContext {
  orgId: string;
  orgName: string;
  tagline: string;
  taglineAr: string;
  taxNumber: string;
  config: ReceiptConfig;
}

interface SavedReceipt {
  tagline?: string;
  taglineAr?: string;
  taxNumber?: string;
  config?: Partial<ReceiptConfig>;
}

/** Resolve an org (by slug = subdomain) and its saved receipt branding/config. */
export async function loadOrgReceiptContext(orgSlug: string): Promise<OrgReceiptContext | null> {
  const org = await getOrganizationBySubdomain(orgSlug);
  if (!org) return null;

  const { data } = await supabaseAdmin
    .from('organization_configs')
    .select('receipt_config')
    .eq('organization_id', org.id)
    .maybeSingle();

  const saved = (data?.receipt_config ?? {}) as SavedReceipt;
  return {
    orgId: org.id,
    orgName: org.name,
    tagline: saved.tagline ?? '',
    taglineAr: saved.taglineAr ?? '',
    taxNumber: saved.taxNumber ?? '',
    config: { ...DEFAULT_RECEIPT_CONFIG, ...(saved.config ?? {}) },
  };
}
