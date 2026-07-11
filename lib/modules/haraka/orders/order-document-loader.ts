import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrganizationBySubdomain } from '@/lib/db/organizations';
import { loadOrgReceiptContext } from '@/lib/receipts/public-receipt';
import {
  DEFAULT_ORDER_DOCUMENT_CONFIG,
  type OrderDocumentConfig,
} from '@/lib/modules/haraka/orders/order-document-config';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import { DEFAULT_RECEIPT_CONFIG } from '@/lib/receipts/receipt-config';

type Row = Record<string, unknown>;

export interface OrderDocumentContext {
  orgId:      string;
  orgName:    string;
  orgSlug:    string;
  tagline:    string;
  taglineAr:  string;
  taxNumber:  string;
  receiptConfig: ReceiptConfig;
  docConfig:  OrderDocumentConfig;
}

export interface OrderDocumentOrder {
  id:             string;
  orderNumber:    string;
  invoiceNumber:  string | null;
  channel:        string;
  fulfillmentType: string;
  customerName:   string;
  customerPhone:  string | null;
  deliveryAddress: Record<string, string | null> | null;
  items:          Array<{
    inventoryItemName: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    lineTotal: number;
  }>;
  subtotal:       number;
  discountAmount: number;
  taxAmount:      number;
  total:          number;
  paymentStatus:  string;
  amountPaid:     number;
  paymentMethod:  string | null;
  salesAgentName: string;
  deliveryAgentName: string | null;
  notes:          string | null;
  scheduledAt:    string | null;
  createdAt:      string;
}

/** Load order + org branding for the public document page (no auth). */
export async function loadOrderDocument(
  orgSlug: string,
  orderId: string,
): Promise<{ ctx: OrderDocumentContext; order: OrderDocumentOrder } | null> {
  const org = await getOrganizationBySubdomain(orgSlug);
  if (!org) return null;

  const [receiptCtx, orderRes, configRes] = await Promise.all([
    loadOrgReceiptContext(orgSlug),
    supabaseAdmin
      .from('haraka_orders')
      .select(
        'id, order_number, invoice_number, channel, fulfillment_type, ' +
        'customer_name, customer_phone, delivery_address, items, ' +
        'subtotal, discount_amount, tax_amount, total, ' +
        'payment_status, amount_paid, payment_method, ' +
        'sales_agent_name, delivery_agent_name, notes, scheduled_at, created_at',
      )
      .eq('id', orderId)
      .eq('organization_id', org.id)
      .maybeSingle(),
    supabaseAdmin
      .from('organization_configs')
      .select('order_document_config')
      .eq('organization_id', org.id)
      .maybeSingle(),
  ]);

  if (!orderRes.data || orderRes.error) return null;

  // haraka_orders is not in the Supabase generated types — double-cast via unknown
  const raw = orderRes.data as unknown as Row;
  const configData = configRes.data as unknown as Row | null;
  const saved = (configData?.order_document_config ?? {}) as Partial<OrderDocumentConfig>;
  const rc = receiptCtx ?? {
    orgId: org.id,
    orgName: org.name,
    tagline: '',
    taglineAr: '',
    taxNumber: '',
    config: DEFAULT_RECEIPT_CONFIG,
  };

  type RawItem = {
    inventoryItemName?: string;
    quantity?: number;
    unitPrice?: number;
    discountAmount?: number;
    lineTotal?: number;
  };

  const rawItems = raw.items;
  const items = (Array.isArray(rawItems) ? rawItems as RawItem[] : []).map((l) => {
    const sub = Number(l.quantity ?? 0) * Number(l.unitPrice ?? 0) - Number(l.discountAmount ?? 0);
    return {
      inventoryItemName: l.inventoryItemName ?? 'Item',
      quantity:          Number(l.quantity ?? 0),
      unitPrice:         Number(l.unitPrice ?? 0),
      discountAmount:    Number(l.discountAmount ?? 0),
      lineTotal:         l.lineTotal != null ? Number(l.lineTotal) : sub,
    };
  });

  return {
    ctx: {
      orgId:         org.id,
      orgName:       org.name,
      orgSlug,
      tagline:       rc.tagline,
      taglineAr:     rc.taglineAr,
      taxNumber:     rc.taxNumber,
      receiptConfig: rc.config,
      docConfig:     { ...DEFAULT_ORDER_DOCUMENT_CONFIG, ...saved },
    },
    order: {
      id:               raw.id as string,
      orderNumber:      raw.order_number as string,
      invoiceNumber:    (raw.invoice_number as string) ?? null,
      channel:          raw.channel as string,
      fulfillmentType:  raw.fulfillment_type as string,
      customerName:     raw.customer_name as string,
      customerPhone:    (raw.customer_phone as string) ?? null,
      deliveryAddress:  (raw.delivery_address as Record<string, string | null>) ?? null,
      items,
      subtotal:         Number(raw.subtotal),
      discountAmount:   Number(raw.discount_amount),
      taxAmount:        Number(raw.tax_amount),
      total:            Number(raw.total),
      paymentStatus:    raw.payment_status as string,
      amountPaid:       Number(raw.amount_paid),
      paymentMethod:    (raw.payment_method as string) ?? null,
      salesAgentName:   raw.sales_agent_name as string,
      deliveryAgentName:(raw.delivery_agent_name as string) ?? null,
      notes:            (raw.notes as string) ?? null,
      scheduledAt:      (raw.scheduled_at as string) ?? null,
      createdAt:        raw.created_at as string,
    },
  };
}
