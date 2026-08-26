'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import type {
  ZeyaraVisit,
  ZeyaraVisitNote,
  ZeyaraVisitAttachment,
  ZeyaraFollowUp,
} from '@/types';
import type {
  CreateVisitPayload,
  UpdateVisitPayload,
} from '@/lib/modules/zeyara/visits/schemas';

const LIST_KEY = ['zeyara', 'visits'] as const;
const FOLLOW_UPS_KEY = ['zeyara', 'follow-ups'] as const;

function spaceHeaders(space?: string): HeadersInit {
  return space ? { 'x-space-slug': space } : {};
}

/** Surfaces the API's own message — the service returns specific text
 *  ("This appointment already has a clinical record") the form shows verbatim. */
async function errorFrom(res: Response, fallback: string): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  return new Error(typeof body.error === 'string' ? body.error : fallback);
}

export interface UseVisitsParams {
  customerId?: string;
  providerId?: string;
  appointmentId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

interface ListResp {
  items: ZeyaraVisit[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useVisits(params?: UseVisitsParams, enabled = true) {
  const { space } = useParams<{ space?: string }>();
  const query = new URLSearchParams();
  if (params?.customerId) query.set('customerId', params.customerId);
  if (params?.providerId) query.set('providerId', params.providerId);
  if (params?.appointmentId) query.set('appointmentId', params.appointmentId);
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  return useQuery<ListResp>({
    queryKey: [...LIST_KEY, space, params],
    enabled: enabled && !!space,
    queryFn: async () => {
      const res = await fetch(`/api/zeyara/visits?${query.toString()}`, {
        headers: spaceHeaders(space),
        cache: 'no-store',
      });
      if (!res.ok) throw await errorFrom(res, 'Failed to fetch clinical records');
      return res.json();
    },
    staleTime: 15_000,
  });
}

export function useVisit(id: string | undefined) {
  const { space } = useParams<{ space?: string }>();
  return useQuery<{ visit: ZeyaraVisit }>({
    queryKey: [...LIST_KEY, space, id],
    enabled: !!id && !!space,
    queryFn: async () => {
      const res = await fetch(`/api/zeyara/visits/${id}`, { headers: spaceHeaders(space) });
      if (!res.ok) throw await errorFrom(res, 'Failed to fetch clinical record');
      return res.json();
    },
  });
}

/**
 * The clinical record attached to one appointment, if it has been opened.
 * Returns `items[0] ?? null` rather than 404-ing, so the appointment page can
 * render an "Open clinical record" affordance when there is none.
 */
export function useVisitForAppointment(appointmentId: string | undefined) {
  const { space } = useParams<{ space?: string }>();
  return useQuery<ZeyaraVisit | null>({
    queryKey: [...LIST_KEY, space, 'by-appointment', appointmentId],
    enabled: !!appointmentId && !!space,
    queryFn: async () => {
      const res = await fetch(`/api/zeyara/visits?appointmentId=${appointmentId}`, {
        headers: spaceHeaders(space),
        cache: 'no-store',
      });
      if (!res.ok) throw await errorFrom(res, 'Failed to fetch clinical record');
      const data = (await res.json()) as ListResp;
      return data.items[0] ?? null;
    },
  });
}

export function useCreateVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateVisitPayload) => {
      const res = await fetch('/api/zeyara/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await errorFrom(res, 'Failed to open clinical record');
      return res.json() as Promise<{ visit: ZeyaraVisit }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: FOLLOW_UPS_KEY });
    },
  });
}

export function useUpdateVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateVisitPayload }) => {
      const res = await fetch(`/api/zeyara/visits/${vars.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars.body),
      });
      if (!res.ok) throw await errorFrom(res, 'Failed to save clinical record');
      return res.json() as Promise<{ visit: ZeyaraVisit }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: FOLLOW_UPS_KEY });
    },
  });
}

export function useDeleteVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/zeyara/visits/${id}`, { method: 'DELETE' });
      if (!res.ok) throw await errorFrom(res, 'Failed to delete clinical record');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: FOLLOW_UPS_KEY });
    },
  });
}

// ── Notes (append-only) ───────────────────────────────────────────────────

export function useVisitNotes(visitId: string | undefined) {
  const { space } = useParams<{ space?: string }>();
  return useQuery<{ notes: ZeyaraVisitNote[] }>({
    queryKey: [...LIST_KEY, space, visitId, 'notes'],
    enabled: !!visitId && !!space,
    queryFn: async () => {
      const res = await fetch(`/api/zeyara/visits/${visitId}/notes`, { headers: spaceHeaders(space) });
      if (!res.ok) throw await errorFrom(res, 'Failed to fetch notes');
      return res.json();
    },
  });
}

export function useAddVisitNote(visitId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/zeyara/visits/${visitId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw await errorFrom(res, 'Failed to add note');
      return res.json() as Promise<{ note: ZeyaraVisitNote }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

// ── Attachments ───────────────────────────────────────────────────────────

export function useVisitAttachments(visitId: string | undefined) {
  const { space } = useParams<{ space?: string }>();
  return useQuery<{ attachments: ZeyaraVisitAttachment[] }>({
    queryKey: [...LIST_KEY, space, visitId, 'attachments'],
    enabled: !!visitId && !!space,
    // Signed URLs expire in an hour; refetch well inside that so a link the
    // user clicks is never already dead.
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const res = await fetch(`/api/zeyara/visits/${visitId}/attachments`, {
        headers: spaceHeaders(space),
      });
      if (!res.ok) throw await errorFrom(res, 'Failed to fetch attachments');
      return res.json();
    },
  });
}

export function useUploadVisitAttachment(visitId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/zeyara/visits/${visitId}/attachments`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw await errorFrom(res, 'Upload failed');
      return res.json() as Promise<{ attachment: ZeyaraVisitAttachment }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useDeleteVisitAttachment(visitId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const res = await fetch(`/api/zeyara/visits/${visitId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw await errorFrom(res, 'Failed to delete attachment');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

// ── Follow-ups ────────────────────────────────────────────────────────────

interface FollowUpsResp {
  items: ZeyaraFollowUp[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useFollowUps(params?: { through?: string; page?: number; pageSize?: number }) {
  const { space } = useParams<{ space?: string }>();
  const query = new URLSearchParams();
  if (params?.through) query.set('through', params.through);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  return useQuery<FollowUpsResp>({
    queryKey: [...FOLLOW_UPS_KEY, space, params],
    enabled: !!space,
    queryFn: async () => {
      const res = await fetch(`/api/zeyara/follow-ups?${query.toString()}`, {
        headers: spaceHeaders(space),
        cache: 'no-store',
      });
      if (!res.ok) throw await errorFrom(res, 'Failed to fetch follow-ups');
      return res.json();
    },
    staleTime: 60_000,
  });
}
