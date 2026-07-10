import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { WarrantyCertPreview } from '@/components/haraka/WarrantyCertPreview';
import type { HarakaWarrantyCert, HarakaWarrantyConfig, WarrantyCertItem } from '@/types';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>

function toCert(r: Row): HarakaWarrantyCert {
  return {
    id:                 r.id as string,
    organizationId:     r.organization_id as string,
    spaceId:            (r.space_id as string) ?? null,
    warrantyNumber:     r.warranty_number as string,
    sourceType:         r.source_type as 'order' | 'pos_transaction',
    orderId:            (r.order_id as string) ?? null,
    transactionId:      (r.transaction_id as string) ?? null,
    customerName:       r.customer_name as string,
    customerPhone:      (r.customer_phone as string) ?? null,
    items:              Array.isArray(r.items) ? (r.items as WarrantyCertItem[]) : [],
    warrantyStartDate:  r.warranty_start_date as string,
    warrantyEndDate:    r.warranty_end_date as string,
    notes:              (r.notes as string) ?? null,
    createdAt:          new Date(r.created_at as string),
    createdBy:          (r.created_by as string) ?? null,
    updatedAt:          new Date(r.updated_at as string),
    updatedBy:          (r.updated_by as string) ?? null,
  }
}

const CONFIG_DEFAULTS: Omit<HarakaWarrantyConfig, 'organizationId'> = {
  defaultDurationDays: 180,
  termsText: null, termsTextAr: null,
  headerText: null, headerTextAr: null,
  footerText: null, footerTextAr: null,
  showLogo: true, showQr: false,
  language: 'en', template: 'a4-modern', accentColor: '#C2185B',
}

async function loadCert(orgSlug: string, certId: string) {
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id, name')
    .eq('subdomain', orgSlug)
    .maybeSingle()
  if (!org) return null

  const { data: certRow } = await supabaseAdmin
    .from('haraka_warranty_certs')
    .select('*')
    .eq('id', certId)
    .maybeSingle()
  if (!certRow || certRow.organization_id !== org.id) return null

  const { data: cfgRow } = await supabaseAdmin
    .from('haraka_warranty_configs')
    .select('*')
    .eq('organization_id', org.id)
    .maybeSingle()

  const config: HarakaWarrantyConfig = cfgRow
    ? {
        organizationId:      org.id as string,
        defaultDurationDays: Number(cfgRow.default_duration_days ?? 180),
        termsText:    (cfgRow.terms_text as string) ?? null,
        termsTextAr:  (cfgRow.terms_text_ar as string) ?? null,
        headerText:   (cfgRow.header_text as string) ?? null,
        headerTextAr: (cfgRow.header_text_ar as string) ?? null,
        footerText:   (cfgRow.footer_text as string) ?? null,
        footerTextAr: (cfgRow.footer_text_ar as string) ?? null,
        showLogo:     (cfgRow.show_logo as boolean) ?? true,
        showQr:       (cfgRow.show_qr as boolean) ?? false,
        language:     (cfgRow.language as 'en'|'ar'|'both') ?? 'en',
        template:     (cfgRow.template as string) ?? 'a4-modern',
        accentColor:  (cfgRow.accent_color as string) ?? '#C2185B',
      }
    : { organizationId: org.id as string, ...CONFIG_DEFAULTS }

  return {
    cert:      toCert(certRow),
    config,
    orgName:   org.name as string,
    orgNameAr: undefined, // organizations has no Arabic-name column
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ orgSlug: string; certId: string }> },
): Promise<Metadata> {
  const { orgSlug, certId } = await params
  const res = await loadCert(orgSlug, certId)
  return {
    title: res ? `${res.orgName} — Warranty ${res.cert.warrantyNumber}` : 'Warranty Certificate',
    robots: { index: false, follow: false },
  }
}

export default async function WarrantyCertPage(
  { params }: { params: Promise<{ orgSlug: string; certId: string }> },
) {
  const { orgSlug, certId } = await params
  const res = await loadCert(orgSlug, certId)
  if (!res) notFound()

  const lang = res.config.language === 'ar' ? 'ar' : 'en'

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center py-8 px-4">
      <div className="shadow-xl rounded-xl overflow-hidden">
        <WarrantyCertPreview
          cert={res.cert}
          config={res.config}
          orgName={res.orgName}
          orgNameAr={res.orgNameAr}
          lang={lang}
        />
      </div>
    </div>
  )
}
