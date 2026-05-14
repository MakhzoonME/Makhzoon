'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  useSupportTicket,
  useTicketMessages,
  useUpdateTicket,
  useAddTicketMessage,
} from '@/hooks/support';
import { formatDate, formatDateTime } from '@/lib/utils/date';
import { toast } from '@/hooks/ui';

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [replyBody, setReplyBody] = useState('');

  const { data: ticket, isLoading: ticketLoading } = useSupportTicket(ticketId);
  const { data: messages = [], isLoading: messagesLoading } = useTicketMessages(ticketId);
  const updateMutation = useUpdateTicket(ticketId);
  const addMessageMutation = useAddTicketMessage(ticketId);

  const isClosed = ticket?.status === 'CLOSED' || ticket?.status === 'RESOLVED';

  async function handleClose() {
    try {
      await updateMutation.mutateAsync({ status: 'CLOSED' });
      toast.success('Ticket closed.');
    } catch {
      toast.error('Failed to close ticket. Please try again.');
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addMessageMutation.mutateAsync(replyBody);
      setReplyBody('');
      toast.success('Reply sent.');
    } catch {
      toast.error('Failed to send reply. Please try again.');
    }
  }

  if (ticketLoading) return <LoadingSkeleton rows={6} columns={1} />;
  if (!ticket) return <p className="text-sm text-gray-500 p-6">Ticket not found.</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={ticket.subject}
        actions={
          !isClosed ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClose}
              disabled={updateMutation.isPending}
            >
              Close Ticket
            </Button>
          ) : undefined
        }
      />

      {/* Metadata */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xs font-semibold uppercase text-gray-500 mb-4">Details</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="mt-0.5"><StatusBadge status={ticket.status} /></dd>
            </div>
            <div>
              <dt className="text-gray-500">Priority</dt>
              <dd className="mt-0.5"><StatusBadge status={ticket.priority} /></dd>
            </div>
            <div>
              <dt className="text-gray-500">Submitted</dt>
              <dd className="mt-0.5 font-medium">{formatDate(new Date(ticket.createdAt))}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Last Updated</dt>
              <dd className="mt-0.5 font-medium">{formatDate(new Date(ticket.updatedAt))}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gray-500">Description</dt>
              <dd className="mt-1 text-gray-900 whitespace-pre-wrap">{ticket.description}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Message thread */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Conversation {messagesLoading ? '…' : `(${messages.length})`}
        </h3>
        {messages.length === 0 && !messagesLoading && (
          <p className="text-sm text-gray-500">No replies yet.</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="bg-surface-card border border-border rounded-lg p-4 space-y-1"
          >
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-gray-800">{msg.authorName}</span>
              <span className="capitalize bg-surface-page px-1.5 py-0.5 rounded">{msg.authorRole}</span>
              <span className="ml-auto">{formatDateTime(new Date(msg.createdAt))}</span>
            </div>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{msg.body}</p>
          </div>
        ))}
      </div>

      {/* Reply box */}
      {!isClosed && (
        <form onSubmit={handleReply} className="space-y-2">
          <Textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write a reply…"
            rows={4}
            required
            minLength={1}
            maxLength={2000}
            disabled={addMessageMutation.isPending}
          />
          <div className="flex items-center justify-between">
            <span className={`text-[11px] ${replyBody.length > 1800 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>{replyBody.length}/2000</span>
            <Button type="submit" size="sm" disabled={addMessageMutation.isPending || !replyBody.trim()}>
              {addMessageMutation.isPending ? 'Sending…' : 'Send Reply'}
            </Button>
          </div>
        </form>
      )}
      {isClosed && (
        <p className="text-sm text-gray-400 text-center py-2">This ticket is closed.</p>
      )}
    </div>
  );
}
