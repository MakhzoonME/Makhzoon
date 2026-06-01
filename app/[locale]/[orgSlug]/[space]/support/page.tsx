'use client';
import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useOrgSlug, useSpace } from '@/hooks/ui';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import {
  useSupportTickets,
  useCreateTicket,
  useSupportTicket,
  useTicketMessages,
  useUpdateTicket,
  useAddTicketMessage,
} from '@/hooks/support';
import { SupportTicket } from '@/types';
import { formatDate, formatDateTime } from '@/lib/utils/date';
import { toast, useT } from '@/hooks/ui';
import { Plus, Send } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/* ── Priority colors ─────────────────────────────────────────────── */
const PRIORITY_STYLES: Record<string, string> = {
  URGENT: 'bg-[var(--red-100)] text-[var(--red-700)] border-[var(--red-100)]',
  HIGH:   'bg-[var(--yellow-100)] text-[var(--yellow-700)] border-[var(--yellow-100)]',
  MEDIUM: 'bg-[var(--blue-100)] text-[var(--blue-700)] border-[var(--blue-100)]',
  LOW:    'bg-surface-page text-gray-600 border-border',
};
function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium', PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.LOW)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {priority}
    </span>
  );
}

/* ── Ticket list item ─────────────────────────────────────────────── */
function TicketListItem({
  ticket, selected, onClick,
}: { ticket: SupportTicket; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'px-4 py-3.5 border-b border-border cursor-pointer transition-colors duration-150',
        selected
          ? 'bg-primary-50 dark:bg-primary-950/20 border-s-[3px] border-s-primary-600'
          : 'hover:bg-surface-page border-s-[3px] border-s-transparent',
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-400 font-mono">#{ticket.id.slice(-6)}</span>
        <span className="text-[11px] text-gray-400 tabular-nums font-mono">
          {formatDate(new Date(ticket.createdAt))}
        </span>
      </div>
      <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 mb-2">{ticket.subject}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <PriorityBadge priority={ticket.priority} />
        <StatusBadge status={ticket.status} />
      </div>
    </div>
  );
}

/* ── Ticket detail panel ─────────────────────────────────────────── */
function TicketDetailPanel({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const { t } = useT();
  const [replyBody, setReplyBody] = useState('');

  const { data: ticket, isLoading: ticketLoading } = useSupportTicket(ticketId);
  const { data: messages = [], isLoading: messagesLoading } = useTicketMessages(ticketId);
  const updateMutation   = useUpdateTicket(ticketId);
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
    if (!replyBody.trim()) return;
    try {
      await addMessageMutation.mutateAsync(replyBody);
      setReplyBody('');
      toast.success(t('ticket.replySent'));
    } catch {
      toast.error(t('ticket.replyFailed'));
    }
  }

  if (ticketLoading) return <div className="flex-1 p-6"><LoadingSkeleton rows={4} columns={1} /></div>;
  if (!ticket) return <div className="flex-1 flex items-center justify-center text-sm text-gray-400">{t('ticket.notFound')}</div>;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4 flex-shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400 font-mono">#{ticket.id.slice(-6)}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <h2 className="text-sm font-semibold text-gray-900 leading-snug">{ticket.subject}</h2>
          <p className="text-xs text-gray-400 mt-1">
            {t('ticket.submitted')} {formatDate(new Date(ticket.createdAt))}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isClosed && (
            <Button size="sm" variant="outline"
              className="cursor-pointer transition-colors duration-150"
              onClick={handleClose} disabled={updateMutation.isPending}>
              {t('ticket.closeTicket')}
            </Button>
          )}
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="text-gray-400 hover:text-gray-700 transition-colors duration-150 cursor-pointer p-1 rounded"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Description */}
      {ticket.description && (
        <div className="px-5 py-3 border-b border-border flex-shrink-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{t('support.description')}</p>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
        {messagesLoading && <div className="text-xs text-gray-400">{t('common.loading')}</div>}
        {!messagesLoading && messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">{t('ticket.noReplies')}</p>
        )}
        {messages.map((msg) => {
          const isSupport = msg.authorRole === 'support' || msg.authorRole === 'makhzoon_support';
          return (
            <div key={msg.id} className="flex gap-3 items-start">
              {/* Initials */}
              <div
                aria-hidden
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
                style={{
                  background: isSupport ? 'var(--primary-100)' : 'var(--surface-inset)',
                  color:      isSupport ? 'var(--primary-700)' : 'var(--gray-600)',
                }}
              >
                {(msg.authorName ?? '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-gray-800">{msg.authorName}</span>
                  {isSupport && (
                    <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded font-medium">
                      {t('support.makhzoonSupport')}
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400 tabular-nums font-mono ms-auto">
                    {formatDateTime(new Date(msg.createdAt))}
                  </span>
                </div>
                <div
                  className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap rounded-xl px-3 py-2.5"
                  style={{ background: isSupport ? 'var(--primary-50)' : 'var(--surface-page)', border: '1px solid var(--border-default)' }}
                >
                  {msg.body}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply box */}
      <div className="flex-shrink-0 border-t border-border px-5 py-4">
        {isClosed ? (
          <p className="text-xs text-gray-400 text-center py-1">{t('ticket.isClosed')}</p>
        ) : (
          <form onSubmit={handleReply} className="flex gap-2 items-end">
            <Textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder={t('ticket.writeReply')}
              rows={2}
              required
              minLength={1}
              maxLength={2000}
              disabled={addMessageMutation.isPending}
              className="flex-1 resize-none text-sm"
            />
            <Button type="submit" size="sm"
              className="cursor-pointer transition-colors duration-150 flex-shrink-0"
              disabled={addMessageMutation.isPending || !replyBody.trim()}>
              <Send aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="ms-1 hidden sm:inline">{t('ticket.sendReply')}</span>
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function SupportPage() {
  const { t } = useT();
  const router   = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedTicketId = searchParams.get('ticket') ?? null;

  const [showNew, setShowNew]   = useState(false);
  const [subject, setSubject]   = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);

  const { data: ticketsData, isLoading } = useSupportTickets({
    page,
    pageSize: 50,
    sortBy: 'createdAt',
    sortDir: 'desc',
  });
  const tickets: SupportTicket[] = ticketsData?.items ?? [];
  const createMutation = useCreateTicket();

  const filtered = search.trim()
    ? tickets.filter((t) => t.subject.toLowerCase().includes(search.toLowerCase()))
    : tickets;

  function selectTicket(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) { params.set('ticket', id); } else { params.delete('ticket'); }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await createMutation.mutateAsync({ subject, description });
      toast.success(t('support.submitted'));
      setShowNew(false);
      setSubject('');
      setDescription('');
      // Auto-select the new ticket
      if (created?.id) selectTicket(created.id);
    } catch {
      toast.error(t('support.submitFailed'));
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t('nav.support')}
        actions={
          <Button size="sm" onClick={() => setShowNew(true)} className="cursor-pointer transition-colors duration-150">
            <Plus aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            <span className="ms-1">{t('support.submitTicket')}</span>
          </Button>
        }
      />

      <div className="flex flex-1 min-h-0 gap-0 bg-surface-card rounded-xl border border-border overflow-hidden">

        {/* ── Left: ticket list ─────────────────────────────────── */}
        <div className={cn(
          'flex flex-col border-e border-border flex-shrink-0 bg-surface-card',
          selectedTicketId ? 'hidden md:flex md:w-80' : 'w-full md:w-80',
        )}>
          {/* Search */}
          <div className="px-3 py-3 border-b border-border">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('support.searchTickets')}
              className="h-8 text-xs"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 bg-surface-page rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-surface-page rounded animate-pulse w-1/2" />
                  </div>
                ))}
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm px-4 text-center">
                {t('support.noTickets')}
              </div>
            )}
            {filtered.map((ticket) => (
              <TicketListItem
                key={ticket.id}
                ticket={ticket}
                selected={selectedTicketId === ticket.id}
                onClick={() => selectTicket(ticket.id)}
              />
            ))}
          </div>
        </div>

        {/* ── Right: detail panel ───────────────────────────────── */}
        {selectedTicketId ? (
          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            <TicketDetailPanel
              ticketId={selectedTicketId}
              onClose={() => selectTicket(null)}
            />
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-sm text-gray-400 flex-col gap-3">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden className="text-gray-300">
              <rect x="4" y="8" width="32" height="24" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M12 16h16M12 21h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>{t('support.selectTicket')}</span>
          </div>
        )}
      </div>

      {/* New ticket dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('support.newTicket')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 px-6 pt-4 pb-2">
            <div className="space-y-1.5">
              <Label htmlFor="subject">{t('support.subject')}</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder={t('support.subjectPlaceholder')} required minLength={5} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">{t('support.description')}</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder={t('support.descPlaceholder')} rows={5} required minLength={20} maxLength={5000} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline"
                className="cursor-pointer transition-colors duration-150"
                onClick={() => setShowNew(false)}>{t('common.cancel')}</Button>
              <Button type="submit"
                className="cursor-pointer transition-colors duration-150"
                disabled={createMutation.isPending}>
                {createMutation.isPending ? t('support.submitting') : t('support.submitTicket')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
