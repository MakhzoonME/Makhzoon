import { supabaseAdmin } from '@/lib/supabase/admin';
import type { PaymentLog, PaymentLogMethod } from '@/types';

type Row = Record<string, unknown>;

function toPaymentLog(r: Row): PaymentLog {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    subscriptionId: r.subscription_id as string,
    amount: r.amount as number,
    currency: r.currency as string,
    method: r.method as PaymentLogMethod,
    reference: (r.reference as string) ?? null,
    paidAt: r.paid_at ? new Date(r.paid_at as string) : new Date(),
    notes: (r.notes as string) ?? null,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: (r.created_by as string) ?? '',
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: (r.updated_by as string) ?? '',
  };
}

export async function getPaymentLogs(
  orgId: string,
  opts?: { limit?: number },
): Promise<PaymentLog[]> {
  let q = supabaseAdmin
    .from('payment_logs')
    .select('*')
    .eq('organization_id', orgId)
    .order('paid_at', { ascending: false });
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(toPaymentLog);
}

export async function getPaymentLogById(
  logId: string,
): Promise<PaymentLog | null> {
  const { data } = await supabaseAdmin
    .from('payment_logs')
    .select('*')
    .eq('id', logId)
    .maybeSingle();
  return data ? toPaymentLog(data) : null;
}

export async function createPaymentLog(
  userId: string,
  payload: {
    organizationId: string;
    subscriptionId: string;
    amount: number;
    currency: string;
    method: PaymentLogMethod;
    reference?: string | null;
    paidAt: Date;
    notes?: string | null;
  },
): Promise<PaymentLog> {
  const { data, error } = await supabaseAdmin
    .from('payment_logs')
    .insert({
      organization_id: payload.organizationId,
      subscription_id: payload.subscriptionId,
      amount: payload.amount,
      currency: payload.currency.toUpperCase(),
      method: payload.method,
      reference: payload.reference ?? null,
      paid_at: new Date(payload.paidAt).toISOString(),
      notes: payload.notes ?? null,
      created_by: userId,
      updated_by: userId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toPaymentLog(data);
}

export async function deletePaymentLog(logId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('payment_logs')
    .delete()
    .eq('id', logId);
  if (error) throw error;
}
