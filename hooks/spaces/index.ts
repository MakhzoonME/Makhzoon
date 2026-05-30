'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Space } from '@/types/space.types';

interface ListResp { items: Space[] }
interface MembersResp { items: Array<{ id: string; userId: string; displayName?: string; email?: string }> }

const LIST_KEY = ['spaces'] as const;

/** Spaces the caller can navigate to (sidebar / switcher). */
export function useAccessibleSpaces() {
  return useQuery<ListResp>({
    queryKey: [...LIST_KEY, 'accessible'],
    queryFn: async () => {
      const res = await fetch('/api/spaces?scope=accessible');
      if (!res.ok) throw new Error('Failed to load spaces');
      return res.json();
    },
    staleTime: 60_000,
  });
}

/** All org spaces (including archived) — admin/owner. */
export function useAllSpaces() {
  return useQuery<ListResp>({
    queryKey: [...LIST_KEY, 'all'],
    queryFn: async () => {
      const res = await fetch('/api/spaces?scope=all');
      if (!res.ok) throw new Error('Failed to load spaces');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useCreateSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; slug?: string }) => {
      const res = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to create space');
      }
      return res.json() as Promise<{ space: Space }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useUpdateSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; name?: string; status?: 'active' | 'archived' }) => {
      const res = await fetch(`/api/spaces/${vars.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: vars.name, status: vars.status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update space');
      }
      return res.json() as Promise<{ space: Space }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useSpaceMembers(spaceId: string | undefined) {
  return useQuery<MembersResp>({
    queryKey: ['spaces', spaceId, 'members'],
    queryFn: async () => {
      const res = await fetch(`/api/spaces/${spaceId}/members`);
      if (!res.ok) throw new Error('Failed to load members');
      return res.json();
    },
    enabled: !!spaceId,
    staleTime: 30_000,
  });
}

export function useAddSpaceMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { spaceId: string; userId: string }) => {
      const res = await fetch(`/api/spaces/${vars.spaceId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: vars.userId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to add member');
      }
      return res.json();
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['spaces', vars.spaceId, 'members'] });
    },
  });
}

export function useRemoveSpaceMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { spaceId: string; userId: string }) => {
      const res = await fetch(`/api/spaces/${vars.spaceId}/members/${vars.userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to remove member');
      }
      return res.json();
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['spaces', vars.spaceId, 'members'] });
    },
  });
}

/* ── Per-user space access (admin only) ────────────────────────── */

interface UserSpaceAccess { allSpaces: boolean; spaceIds: string[] }

export function useUserSpaceAccess(userId: string | undefined) {
  return useQuery<UserSpaceAccess>({
    queryKey: ['users', userId, 'spaces'],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/spaces`);
      if (!res.ok) throw new Error('Failed to load user space access');
      return res.json();
    },
    enabled: !!userId,
    staleTime: 0,
  });
}

export function useMoveResources() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { type: 'asset' | 'inventory'; ids: string[]; targetSpaceId: string }) => {
      const res = await fetch('/api/spaces/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to move');
      }
      return res.json() as Promise<{ ok: true; moved: number }>;
    },
    onSuccess: (_d, vars) => {
      // Invalidate the affected modules' caches. The moved record(s) may
      // now be invisible from this space, so list queries refetch.
      if (vars.type === 'asset') {
        qc.invalidateQueries({ queryKey: ['assets'] });
      } else {
        qc.invalidateQueries({ queryKey: ['inventory'] });
      }
    },
  });
}

export function useUpdateUserSpaceAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { userId: string; allSpaces: boolean; spaceIds: string[] }) => {
      const res = await fetch(`/api/users/${vars.userId}/spaces`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allSpaces: vars.allSpaces, spaceIds: vars.spaceIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update space access');
      }
      return res.json();
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['users', vars.userId, 'spaces'] });
      qc.invalidateQueries({ queryKey: LIST_KEY }); // accessible-spaces list may change for that user
    },
  });
}
