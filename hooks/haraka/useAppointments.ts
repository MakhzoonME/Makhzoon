'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import type { AppointmentStatus, HarakaAppointment, HarakaAppointmentPayment } from '@/types';
import type {
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
} from '@/lib/modules/haraka/appointments/schemas';

const LIST_KEY = ['haraka', 'appointments'] as const;

function spaceHeaders(space?: string): HeadersInit {
  return space ? { 'x-space-slug': space } : {};
}

/** Turns a failed response into the API's own message — the booking guard
 *  returns specific text ("outside working hours", "slot taken") that the
 *  form surfaces verbatim. */
async function errorFrom(res: Response, fallback: string): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  return new Error(typeof body.error === 'string' ? body.error : fallback);
}

export interface UseAppointmentsParams {
  status?: string;
  staffId?: string;
  serviceId?: string;
  /** ISO instants — half-open [from, to). */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

interface ListResp {
  items: HarakaAppointment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useAppointments(params?: UseAppointmentsParams, enabled = true) {
  const { space } = useParams<{ space?: string }>();
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.staffId) query.set('staffId', params.staffId);
  if (params?.serviceId) query.set('serviceId', params.serviceId);
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  return useQuery<ListResp>({
    queryKey: [...LIST_KEY, space, params],
    enabled: enabled && !!space,
    queryFn: async () => {
      const res = await fetch(`/api/haraka/appointments?${query.toString()}`, {
        headers: spaceHeaders(space),
        cache: 'no-store',
      });
      if (!res.ok) throw await errorFrom(res, 'Failed to fetch appointments');
      return res.json();
    },
    staleTime: 15_000,
  });
}

export function useAppointment(id: string | undefined) {
  const { space } = useParams<{ space?: string }>();
  return useQuery<{ appointment: HarakaAppointment }>({
    queryKey: ['haraka', 'appointments', space, id],
    enabled: !!id && !!space,
    queryFn: async () => {
      const res = await fetch(`/api/haraka/appointments/${id}`, { headers: spaceHeaders(space) });
      if (!res.ok) throw await errorFrom(res, 'Failed to fetch appointment');
      return res.json();
    },
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateAppointmentPayload) => {
      const res = await fetch('/api/haraka/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await errorFrom(res, 'Failed to book appointment');
      return res.json() as Promise<{ appointment: HarakaAppointment }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ['haraka', 'customers'] });
    },
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateAppointmentPayload }) => {
      const res = await fetch(`/api/haraka/appointments/${vars.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars.body),
      });
      if (!res.ok) throw await errorFrom(res, 'Failed to update appointment');
      return res.json() as Promise<{ appointment: HarakaAppointment }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status: AppointmentStatus }) => {
      const res = await fetch(`/api/haraka/appointments/${vars.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: vars.status }),
      });
      if (!res.ok) throw await errorFrom(res, 'Failed to update status');
      return res.json() as Promise<{ appointment: HarakaAppointment }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useGenerateAppointmentInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/haraka/appointments/${id}/invoice`, { method: 'POST' });
      if (!res.ok) throw await errorFrom(res, 'Failed to generate invoice');
      return res.json() as Promise<{ appointment: HarakaAppointment; invoiceNumber: string | null }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/haraka/appointments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw await errorFrom(res, 'Failed to delete appointment');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

// ── Payments ──────────────────────────────────────────────────────────────

function paymentsKey(appointmentId: string | undefined) {
  return ['haraka', 'appointment-payments', appointmentId] as const;
}

export function useAppointmentPayments(appointmentId: string | undefined) {
  const { space } = useParams<{ space?: string }>();
  return useQuery<{ payments: HarakaAppointmentPayment[] }>({
    queryKey: [...paymentsKey(appointmentId), space],
    enabled: !!appointmentId && !!space,
    queryFn: async () => {
      const res = await fetch(`/api/haraka/appointments/${appointmentId}/payments`, {
        headers: spaceHeaders(space),
      });
      if (!res.ok) throw await errorFrom(res, 'Failed to fetch payments');
      return res.json();
    },
  });
}

export function useAddAppointmentPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      appointmentId: string;
      amount: number;
      paymentMethod: string | null;
      note: string | null;
    }) => {
      const res = await fetch(`/api/haraka/appointments/${vars.appointmentId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: vars.amount,
          paymentMethod: vars.paymentMethod,
          note: vars.note,
        }),
      });
      if (!res.ok) throw await errorFrom(res, 'Failed to add payment');
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: paymentsKey(vars.appointmentId) });
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useRemoveAppointmentPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { appointmentId: string; paymentId: string }) => {
      const res = await fetch(
        `/api/haraka/appointments/${vars.appointmentId}/payments/${vars.paymentId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw await errorFrom(res, 'Failed to remove payment');
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: paymentsKey(vars.appointmentId) });
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
