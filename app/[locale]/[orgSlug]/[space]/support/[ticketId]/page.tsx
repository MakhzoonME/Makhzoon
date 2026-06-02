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
import { toast, useT, useOrgSlug, useSpace } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';

export default function TicketDetailPage() {
  const { t } = useT();
  const orgSlug = useOrgSlug();
  const space   = useSpace();
  const { data: orgInfo } = useOrgInfo();
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
      toast.success(t('ticket.closed'));
    } catch {
      toast.error(t('ticket.closeFailed'));
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addMessageMutation.mutateAsync(replyBody);
      setReplyBody('');
      toast.success(t('ticket.replySent'));
    } catch {
      toast.error(t('ticket.replyFailed'));
    }
  }

  if (ticketLoading) return <LoadingSkeleton rows={6} columns={1} />;
  if (!ticket) return <p className="text-sm text-gray-500 p-6">{t('ticket.notFound')}</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={ticket.subject}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: space },
          { label: t('nav.support') },
          { label: ticket.subject },
        ]}
        actions={
          !isClosed ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClose}
              disabled={updateMutation.isPending}
            >
              {t('ticket.closeTicket')}
            </Button>
          ) : undefined
        }
      />

      {/* Metadata */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xs font-semibold uppercase text-gray-500 mb-4">{t('ticket.details')}</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">{t('support.status')}</dt>
              <dd className="mt-0.5"><StatusBadge status={ticket.status} /></dd>
            </div>
            <div>
              <dt className="text-gray-500">{t('support.priority')}</dt>
              <dd className="mt-0.5"><StatusBadge status={ticket.priority} /></dd>
            </div>
            <div>
              <dt className="text-gray-500">{t('ticket.submitted')}</dt>
              <dd className="mt-0.5 font-medium">{formatDate(new Date(ticket.createdAt))}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{t('ticket.lastUpdated')}</dt>
              <dd className="mt-0.5 font-medium">{formatDate(new Date(ticket.updatedAt))}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gray-500">{t('support.description')}</dt>
              <dd className="mt-1 text-gray-900 whitespace-pre-wrap">{ticket.description}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Message thread */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">
          {t('ticket.conversation')} {messagesLoading ? '…' : `(${messages.length})`}
        </h3>
        {messages.length === 0 && !messagesLoading && (
          <p className="text-sm text-gray-500">{t('ticket.noReplies')}</p>
        )}
        {messages.map((msg) => {
          const isSuperAdmin = msg.authorRole === 'super_admin';
          return (
            <div
              key={msg.id}
              className={`border rounded-lg p-4 space-y-1 ${isSuperAdmin ? 'bg-[color-mix(in_srgb,var(--primary-500)_6%,var(--surface-card))] border-[color-mix(in_srgb,var(--primary-500)_20%,var(--border))]' : 'bg-surface-card border-border'}`}
            >
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-semibold text-gray-900">{msg.authorName}</span>
                {isSuperAdmin ? (
                  <span className="inline-flex items-center gap-1 bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 px-2 py-0.5 rounded-full font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500 inline-block" />
                    Support
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-surface-page text-gray-500 px-2 py-0.5 rounded-full border border-border">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-400 inline-block" />
                    {msg.authorRole === 'org_owner' ? 'Owner' : 'Member'}
                  </span>
                )}
                <span className="ms-auto">{formatDateTime(new Date(msg.createdAt))}</span>
              </div>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{msg.body}</p>
            </div>
          );
        })}
      </div>

      {/* Reply box */}
      {!isClosed && (
        <form onSubmit={handleReply} className="space-y-2">
          <Textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder={t('ticket.writeReply')}
            rows={4}
            required
            minLength={1}
            maxLength={2000}
            disabled={addMessageMutation.isPending}
          />
          <div className="flex items-center justify-between">
            <span className={`text-[11px] ${replyBody.length > 1800 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>{replyBody.length}/2000</span>
            <Button type="submit" size="sm" disabled={addMessageMutation.isPending || !replyBody.trim()}>
              {addMessageMutation.isPending ? t('ticket.sending') : t('ticket.sendReply')}
            </Button>
          </div>
        </form>
      )}
      {isClosed && (
        <p className="text-sm text-gray-400 text-center py-2">{t('ticket.isClosed')}</p>
      )}
    </div>
  );
}
