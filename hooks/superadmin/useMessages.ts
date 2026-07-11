import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ContactSalesEntry } from '@/lib/db/contact-sales';

export type { ContactSalesEntry as WebsiteMessage };

export function useMessages() {
  return useQuery<ContactSalesEntry[]>({
    queryKey: ['superadmin-messages'],
    queryFn: async () => {
      const res = await fetch('/api/superadmin/messages');
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/superadmin/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(typeof e.error === 'string' ? e.error : 'Failed to delete');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-messages'] });
    },
  });
}
