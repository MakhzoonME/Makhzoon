'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Invoice } from '@/types';

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.error === 'string' ? err.error : err.error?.formErrors?.[0] ?? 'Request failed',
    );
  }
  return res.json();
}

function invalidateSubscription(qc: ReturnType<typeof useQueryClient>, orgId: string) {
  qc.invalidateQueries({ queryKey: ['subscription', orgId] });
  qc.invalidateQueries({ queryKey: ['invoices', orgId] });
  qc.invalidateQueries({ queryKey: ['all-orgs-usage'] });
}

export function useCreateSubscription(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { packageId: string; startDate?: string; trialDays?: number }) =>
      postJson(`/api/organizations/${orgId}/subscription/create`, payload),
    onSuccess: () => invalidateSubscription(qc, orgId),
  });
}

export function useRenewSubscription(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { endDate?: string; generateInvoiceNow?: boolean }) =>
      postJson<{ success: true; newEndDate: string; invoiceId?: string }>(
        `/api/organizations/${orgId}/subscription/renew`,
        payload,
      ),
    onSuccess: () => invalidateSubscription(qc, orgId),
  });
}

export function useCancelSubscription(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { reason: string }) =>
      postJson(`/api/organizations/${orgId}/subscription/cancel`, payload),
    onSuccess: () => invalidateSubscription(qc, orgId),
  });
}

export interface ChangePlanPayload {
  packageId: string;
  mode: 'upgrade' | 'downgrade';
  generateInvoiceNow?: boolean;
}

export function useChangeSubscriptionPlan(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChangePlanPayload) =>
      postJson<{ success: true; effectiveAt?: string; invoiceId?: string }>(
        `/api/organizations/${orgId}/subscription/change-plan`,
        payload,
      ),
    onSuccess: () => invalidateSubscription(qc, orgId),
  });
}

export function useRefundInvoice(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { invoiceId: string; amount?: number; reason: string }) =>
      postJson<{ success: true; invoice: Invoice }>(
        `/api/organizations/${orgId}/invoices/${payload.invoiceId}/refund`,
        { amount: payload.amount, reason: payload.reason },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices', orgId] }),
  });
}
