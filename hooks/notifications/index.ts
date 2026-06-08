'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import type { NotificationRow, NotificationPreference, OrgNotificationDefault } from '@/lib/notifications/types';

const LIST_KEY  = ['notifications', 'list'] as const;
const COUNT_KEY = ['notifications', 'unread-count'] as const;
const PREFS_KEY = ['notifications', 'preferences'] as const;
const DEFS_KEY  = ['notifications', 'org-defaults'] as const;

interface ListResp {
  items: NotificationRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useNotifications(params?: { unreadOnly?: boolean; page?: number; pageSize?: number }) {
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const query = new URLSearchParams();
  if (params?.unreadOnly) query.set('unreadOnly', 'true');
  if (params?.page)       query.set('page', String(params.page));
  if (params?.pageSize)   query.set('pageSize', String(params.pageSize));
  return useQuery<ListResp>({
    queryKey: [...LIST_KEY, orgSlug, params],
    enabled:  !!orgSlug,
    queryFn: async () => {
      const res = await fetch(`/api/notifications?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    staleTime: 15_000,
  });
}

export function useUnreadCount() {
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  return useQuery<{ count: number }>({
    queryKey: [...COUNT_KEY, orgSlug],
    enabled:  !!orgSlug,
    queryFn: async () => {
      const res = await fetch('/api/notifications/unread-count');
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: COUNT_KEY });
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await fetch('/api/notifications/read-all', { method: 'POST' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: COUNT_KEY });
    },
  });
}

export function useNotificationPreferences() {
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  return useQuery<{ preferences: NotificationPreference[] }>({
    queryKey: [...PREFS_KEY, orgSlug],
    enabled:  !!orgSlug,
    queryFn: async () => {
      const res = await fetch('/api/notification-preferences');
      if (!res.ok) throw new Error('Failed to fetch preferences');
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: Array<{ eventType: string; inApp: boolean; email: boolean }>) => {
      const res = await fetch('/api/notification-preferences', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error('Failed to update preferences');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PREFS_KEY }),
  });
}

export function useOrgNotificationDefaults() {
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  return useQuery<{ defaults: OrgNotificationDefault[] }>({
    queryKey: [...DEFS_KEY, orgSlug],
    enabled:  !!orgSlug,
    queryFn: async () => {
      const res = await fetch('/api/notification-org-defaults');
      if (!res.ok) throw new Error('Failed to fetch org defaults');
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useUpdateOrgNotificationDefaults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (defaults: Array<{ eventType: string; inAppEnabled: boolean; emailEnabled: boolean; notifyRoles: string[] }>) => {
      const res = await fetch('/api/notification-org-defaults', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(defaults),
      });
      if (!res.ok) throw new Error('Failed to update org defaults');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: DEFS_KEY }),
  });
}
