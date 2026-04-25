'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  useSupportTicket,
  useTicketMessages,
  useUpdateTicket,
  useAddTicketMessage,
} from '@/hooks/useSupportTickets';
import { toast } from '@/hooks/useToast';
import { formatDate } from '@/lib/utils/date';
import type { TicketStatus, TicketPriority } from '@/types';

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function SuperAdminTicketDetailPage({ params }: { params: { ticketId: string } }) {
  const { ticketId } = params;
  const router = useRouter();
  const { data: ticket, isLoading } = useSupportTicket(ticketId);
  const { data: messages = [] } = useTicketMessages(ticketId);
  const updateMut = useUpdateTicket(ticketId);
  const replyMut = useAddTicketMessage(ticketId);
  const [reply, setReply] = useState('');

  async function handleStatus(status: TicketStatus) {
    try {
      await updateMut.mutateAsync({ status });
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  }
  async function handlePriority(priority: TicketPriority) {
    try {
      await updateMut.mutateAsync({ priority });
      toast.success('Priority updated');
    } catch {
      toast.error('Failed to update priority');
    }
  }
  async function handleReply() {
    const body = reply.trim();
    if (!body) return;
    try {
      await replyMut.mutateAsync(body);
      setReply('');
    } catch {
      toast.error('Failed to send reply');
    }
  }

  if (isLoading || !ticket) {
    return (
      <div>
        <PageHeader title="Support Ticket" />
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={ticket.subject}
        description={`Ticket #${ticket.id.slice(0, 8)}`}
        breadcrumb={[
          { label: 'Support', href: '/superadmin/support' },
          { label: 'Detail', href: '' },
        ]}
        actions={
          <Button size="sm" variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <StatusBadge status={ticket.status} />
              <StatusBadge status={ticket.priority} />
              <span className="text-xs text-gray-500 ml-auto">
                Created {formatDate(new Date(ticket.createdAt))}
              </span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
              Org: <span className="font-mono">{ticket.organizationId}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-500">Status</label>
              <select
                value={ticket.status}
                onChange={(e) => handleStatus(e.target.value as TicketStatus)}
                className="mt-1 w-full h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
                disabled={updateMut.isPending}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-500">Priority</label>
              <select
                value={ticket.priority}
                onChange={(e) => handlePriority(e.target.value as TicketPriority)}
                className="mt-1 w-full h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
                disabled={updateMut.isPending}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Conversation</h3>
          <div className="space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-gray-500 italic">No replies yet.</p>
            )}
            {messages.map((m) => {
              const isAdmin = m.authorRole === 'SUPER_ADMIN' || m.authorRole === 'super_admin';
              return (
                <div
                  key={m.id}
                  className={`p-3 rounded-lg border ${
                    isAdmin ? 'bg-indigo-50 border-indigo-100' : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{m.authorName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide ${
                        isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {isAdmin ? 'Super Admin' : 'Org User'}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {formatDate(new Date(m.createdAt))}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.body}</p>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-gray-100 space-y-2">
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type a reply…"
              rows={4}
            />
            <div className="flex justify-end">
              <Button onClick={handleReply} disabled={replyMut.isPending || !reply.trim()}>
                {replyMut.isPending ? 'Sending…' : 'Send Reply'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
