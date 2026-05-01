'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupportTicket, TicketMessage, TicketStatus, TicketPriority } from '@/types';

export function useSupportTickets(filters?: {
  status?: TicketStatus;
  priority?: TicketPriority;
  orgId?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.priority) params.set('priority', filters.priority);
  if (filters?.orgId) params.set('orgId', filters.orgId);
  return useQuery<SupportTicket[]>({
    queryKey: ['support-tickets', filters],
    queryFn: async () => {
      const res = await fetch(`/api/support?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      return res.json();
    },
  });
}

export function useSupportTicket(ticketId: string) {
  return useQuery<SupportTicket>({
    queryKey: ['support-ticket', ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/support/${ticketId}`);
      if (!res.ok) throw new Error('Failed to fetch ticket');
      return res.json();
    },
    enabled: !!ticketId,
  });
}

export function useTicketMessages(ticketId: string) {
  return useQuery<TicketMessage[]>({
    queryKey: ['ticket-messages', ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/support/${ticketId}/messages`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    enabled: !!ticketId,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { subject: string; description: string }) => {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create ticket');
      return res.json() as Promise<SupportTicket>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['support-tickets'] }),
  });
}

export function useUpdateTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { status?: TicketStatus; priority?: TicketPriority }) => {
      const res = await fetch(`/api/support/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update ticket');
      return res.json() as Promise<SupportTicket>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}

export function useAddTicketMessage(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/support/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error('Failed to add message');
      return res.json() as Promise<TicketMessage>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticketId] }),
  });
}
