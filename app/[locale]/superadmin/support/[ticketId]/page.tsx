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
      toast.success(t('ticket.statusUpdated'));
    } catch {
      toast.error(t('ticket.statusUpdateFailed'));
    }
  }
  async function handlePriority(priority: TicketPriority) {
    try {
      await updateMut.mutateAsync({ priority });
      toast.success(t('ticket.priorityUpdated'));
    } catch {
      toast.error(t('ticket.priorityUpdateFailed'));
    }
  }
  async function handleReply() {
    const body = reply.trim();
    if (!body) return;
    try {
      await replyMut.mutateAsync(body);
      setReply('');
    } catch {
      toast.error(t('ticket.replyFailed'));
    }
  }

  if (isLoading || !ticket) {
    return (
      <div>
        <PageHeader title={t('ticket.detail')} />
        <p className="text-gray-500 text-sm">{t('common.loading')}</p>
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
            {t('common.back')}
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
                {t('support.created')} {formatDate(new Date(ticket.createdAt))}
              </span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            <p className="text-xs text-gray-500 pt-2 border-t border-border">
              {t('common.organization')}: <span className="font-mono">{ticket.organizationId}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-500">{t('support.status')}</label>
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
              <label className="text-xs uppercase tracking-wide text-gray-500">{t('support.priority')}</label>
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
          <h3 className="text-sm font-semibold text-gray-900">{t('ticket.conversation')}</h3>
          <div className="space-y-3">
            {messagesLoading && (
              <p className="text-sm text-gray-500 italic">{t('common.loading')}</p>
            )}
            {!messagesLoading && messages.length === 0 && (
              <p className="text-sm text-gray-500 italic">{t('ticket.noReplies')}</p>
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
                      {isAdmin ? t('support.superAdmin') : t('support.orgUser')}
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
              placeholder={t('ticket.writeReply')}
              rows={4}
            />
            <div className="flex justify-end">
              <Button onClick={handleReply} disabled={replyMut.isPending || !reply.trim()}>
                {replyMut.isPending ? t('ticket.sending') : t('ticket.sendReply')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
