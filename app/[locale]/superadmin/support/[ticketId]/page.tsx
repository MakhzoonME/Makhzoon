'use client';
import { useState, use } from 'react';
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
} from '@/hooks/support';
import { toast, useT } from '@/hooks/ui';
import { formatDate } from '@/lib/utils/date';
import type { TicketStatus, TicketPriority } from '@/types';

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function SuperAdminTicketDetailPage(props: { params: Promise<{ ticketId: string }> }) {
  const params = use(props.params);
  const { ticketId } = params;
  const router = useRouter();
  const { t, locale } = useT();
  const { data: ticket, isLoading } = useSupportTicket(ticketId);
  const { data: messages = [], isLoading: messagesLoading } = useTicketMessages(ticketId);
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
          { label: t('nav.support'), href: `/${locale}/superadmin/support` },
          { label: ticket.subject },
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
              <span className="text-xs text-gray-500 ms-auto">
                Created {formatDate(new Date(ticket.createdAt))}
              </span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            <p className="text-xs text-gray-500 pt-2 border-t border-border">
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
                className="mt-1 w-full h-9 rounded-md border border-border bg-surface-card px-3 text-[14px] text-gray-700 focus:outline-none focus:ring-[3px] focus:ring-primary-500/20 focus:border-primary-600"
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
                className="mt-1 w-full h-9 rounded-md border border-border bg-surface-card px-3 text-[14px] text-gray-700 focus:outline-none focus:ring-[3px] focus:ring-primary-500/20 focus:border-primary-600"
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
            {messagesLoading && (
              <p className="text-sm text-gray-500 italic">Loading…</p>
            )}
            {!messagesLoading && messages.length === 0 && (
              <p className="text-sm text-gray-500 italic">No replies yet.</p>
            )}
            {messages.map((m) => {
              const isAdmin = m.authorRole === 'SUPER_ADMIN' || m.authorRole === 'super_admin';
              return (
                <div
                  key={m.id}
                  className={`p-3 rounded-lg border ${
                    isAdmin ? 'bg-primary-100/30 border-primary-200/50' : 'bg-surface-page border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{m.authorName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide ${
                        isAdmin ? 'bg-primary-100/60 text-primary-700' : 'bg-surface-page text-gray-600'
                      }`}
                    >
                      {isAdmin ? 'Super Admin' : 'Org User'}
                    </span>
                    <span className="text-xs text-gray-500 ms-auto">
                      {formatDate(new Date(m.createdAt))}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.body}</p>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-border space-y-2">
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
