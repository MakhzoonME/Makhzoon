import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Invoice, InvoiceLineItem, InvoicePaymentMethod, InvoiceStatus } from '@/types';

type Row = Record<string, unknown>;

function toInvoice(r: Row): Invoice {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    subscriptionId: (r.subscription_id as string) ?? '',
    periodStart: new Date(r.period_start as string),
    periodEnd: new Date(r.period_end as string),
    lineItems: (r.line_items ?? []) as InvoiceLineItem[],
    subtotal: Number(r.subtotal ?? 0),
    foundingCohortDiscount: Number(r.founding_cohort_discount ?? 0),
    total: Number(r.total ?? 0),
    currency: (r.currency as string) ?? 'JOD',
    dueDate: new Date(r.due_date as string),
    graceDeadline: new Date(r.grace_deadline as string),
    status: r.status as InvoiceStatus,
    paymentMethod: (r.payment_method as InvoicePaymentMethod) ?? null,
    paidAt: r.paid_at ? new Date(r.paid_at as string) : null,
    markedPaidBy: (r.marked_paid_by as string) ?? null,
    refundedAt: r.refunded_at ? new Date(r.refunded_at as string) : null,
    refundedBy: (r.refunded_by as string) ?? null,
    refundAmount: r.refund_amount != null ? Number(r.refund_amount) : null,
    refundReason: (r.refund_reason as string) ?? null,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
  };
}

export interface CreateInvoiceInput {
  organizationId: string;
  subscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  foundingCohortDiscount: number;
  total: number;
  currency: string;
  dueDate: Date;
  graceDeadline: Date;
}

/**
 * Insert an invoice. Returns null if one already exists for the subscription's
 * billing period (unique index) so the billing cron is safe to re-run.
 */
export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice | null> {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .insert({
      organization_id: input.organizationId,
      subscription_id: input.subscriptionId,
      period_start: input.periodStart.toISOString(),
      period_end: input.periodEnd.toISOString(),
      line_items: input.lineItems,
      subtotal: input.subtotal,
      founding_cohort_discount: input.foundingCohortDiscount,
      total: input.total,
      currency: input.currency,
      due_date: input.dueDate.toISOString(),
      grace_deadline: input.graceDeadline.toISOString(),
      status: 'PENDING',
    })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') return null; // duplicate period — already billed
    throw error;
  }
  return toInvoice(data);
}

export async function getInvoicesByOrg(orgId: string): Promise<Invoice[]> {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toInvoice);
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const { data } = await supabaseAdmin.from('invoices').select('*').eq('id', id).maybeSingle();
  return data ? toInvoice(data) : null;
}

export async function markInvoicePaid(
  id: string,
  opts: { method: InvoicePaymentMethod; paidAt: Date; markedPaidBy: string },
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('invoices')
    .update({
      status: 'PAID',
      payment_method: opts.method,
      paid_at: opts.paidAt.toISOString(),
      marked_paid_by: opts.markedPaidBy,
    })
    .eq('id', id);
  if (error) throw error;
}

/** PENDING invoices whose grace deadline has passed (for grace-enforcement). */
export async function listPendingInvoicesPastGrace(now: Date): Promise<Invoice[]> {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('status', 'PENDING')
    .lt('grace_deadline', now.toISOString());
  if (error) throw error;
  return (data ?? []).map(toInvoice);
}

/** Still-owed invoices (newest first) — for the superadmin billing view. Excludes
 *  PAID as well as the terminal REFUNDED/VOID statuses, neither of which is "open." */
export async function getOpenInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .in('status', ['PENDING', 'OVERDUE', 'READ_ONLY_TRIGGERED'])
    .order('due_date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toInvoice);
}

export async function markInvoiceReadOnlyTriggered(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('invoices')
    .update({ status: 'READ_ONLY_TRIGGERED' })
    .eq('id', id);
  if (error) throw error;
}

/** Refunds a PAID invoice — full amount by default, or a partial amount. */
export async function refundInvoice(
  id: string,
  opts: { amount?: number; reason: string; refundedBy: string },
): Promise<Invoice> {
  const existing = await getInvoiceById(id);
  if (!existing) throw new Error('Invoice not found');
  if (existing.status !== 'PAID') throw new Error('Only a PAID invoice can be refunded');

  const refundAmount = opts.amount ?? existing.total;
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .update({
      status: 'REFUNDED',
      refunded_at: new Date().toISOString(),
      refunded_by: opts.refundedBy,
      refund_amount: refundAmount,
      refund_reason: opts.reason,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return toInvoice(data);
}

/** Kills a PENDING invoice without payment — used when its subscription is cancelled,
 *  so grace-enforcement never acts on a dead account's leftover invoice. */
export async function voidInvoice(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('invoices')
    .update({ status: 'VOID' })
    .eq('id', id)
    .eq('status', 'PENDING');
  if (error) throw error;
}

/** Voids every still-PENDING invoice for a subscription (cancel flow). */
export async function voidPendingInvoices(subscriptionId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('invoices')
    .update({ status: 'VOID' })
    .eq('subscription_id', subscriptionId)
    .eq('status', 'PENDING');
  if (error) throw error;
}
