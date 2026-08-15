'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlatformNotificationConfig } from '@/lib/platform/notification-config.repository';

const CONFIG_KEY = ['superadmin', 'notification-config'] as const;

export interface NotificationConfigPatch {
  whatsappEnabled?: boolean;
  whatsappPhoneNumberId?: string | null;
  whatsappToken?: string;
  whatsappWebhookSecret?: string;
  ocrProvider?: string;
  ocrApiKey?: string;
}

export function useNotificationConfig() {
  return useQuery<{ config: PlatformNotificationConfig | null }>({
    queryKey: CONFIG_KEY,
    queryFn: async () => {
      const res = await fetch('/api/superadmin/notification-config');
      if (!res.ok) throw new Error('Failed to fetch notification config');
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useUpdateNotificationConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: NotificationConfigPatch) => {
      const res = await fetch('/api/superadmin/notification-config', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update config');
      }
      return res.json() as Promise<{ config: PlatformNotificationConfig }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CONFIG_KEY }),
  });
}
