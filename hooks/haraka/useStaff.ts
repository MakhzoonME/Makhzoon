'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import type {
  HarakaStaff,
  HarakaStaffAvailability,
  HarakaStaffAvailabilityException,
  StaffCapability,
} from '@/types';
import type {
  StaffFormData,
  StaffAvailabilityPayload,
  StaffAvailabilityExceptionPayload,
} from '@/lib/modules/haraka/staff/schemas';

const LIST_KEY = ['haraka', 'staff'] as const;

function spaceHeaders(space?: string): HeadersInit {
  return space ? { 'x-space-slug': space } : {};
}

export interface UseStaffParams {
  onlyActive?: boolean;
  /** Narrows the directory to one role, e.g. 'appointment_provider'. */
  capability?: StaffCapability;
}

export function useStaff(params: UseStaffParams = {}) {
  const { space } = useParams<{ space?: string }>();
  const query = new URLSearchParams();
  if (params.onlyActive) query.set('active', 'true');
  if (params.capability) query.set('capability', params.capability);

  return useQuery<{ items: HarakaStaff[] }>({
    queryKey: [...LIST_KEY, space, params],
    enabled: !!space,
    queryFn: async () => {
      const res = await fetch(`/api/haraka/staff?${query.toString()}`, {
        headers: spaceHeaders(space),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch workers');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: StaffFormData) => {
      const res = await fetch('/api/haraka/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to add worker');
      }
      return res.json() as Promise<{ staff: HarakaStaff }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: Partial<StaffFormData> }) => {
      const res = await fetch(`/api/haraka/staff/${vars.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars.body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update worker');
      }
      return res.json() as Promise<{ staff: HarakaStaff }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/haraka/staff/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to delete worker');
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

// ── Availability ──────────────────────────────────────────────────────────

interface AvailabilityResp {
  weekly: HarakaStaffAvailability[];
  exceptions: HarakaStaffAvailabilityException[];
}

function availabilityKey(staffId: string | undefined) {
  return ['haraka', 'staff-availability', staffId] as const;
}

export function useStaffAvailability(staffId: string | undefined) {
  const { space } = useParams<{ space?: string }>();
  return useQuery<AvailabilityResp>({
    queryKey: [...availabilityKey(staffId), space],
    enabled: !!staffId && !!space,
    queryFn: async () => {
      const res = await fetch(`/api/haraka/staff/${staffId}/availability`, {
        headers: spaceHeaders(space),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch working hours');
      return res.json();
    },
  });
}

export function useAddStaffAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { staffId: string; body: StaffAvailabilityPayload }) => {
      const res = await fetch(`/api/haraka/staff/${vars.staffId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars.body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to add working hours');
      }
      return res.json();
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: availabilityKey(vars.staffId) }),
  });
}

export function useRemoveStaffAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { staffId: string; id: string }) => {
      const res = await fetch(
        `/api/haraka/staff/${vars.staffId}/availability?id=${vars.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to remove working hours');
      }
      return res.json();
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: availabilityKey(vars.staffId) }),
  });
}

export function useUpsertStaffAvailabilityException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { staffId: string; body: StaffAvailabilityExceptionPayload }) => {
      const res = await fetch(`/api/haraka/staff/${vars.staffId}/availability/exceptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars.body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to save exception');
      }
      return res.json();
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: availabilityKey(vars.staffId) }),
  });
}

export function useRemoveStaffAvailabilityException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { staffId: string; id: string }) => {
      const res = await fetch(
        `/api/haraka/staff/${vars.staffId}/availability/exceptions?id=${vars.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to remove exception');
      }
      return res.json();
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: availabilityKey(vars.staffId) }),
  });
}
