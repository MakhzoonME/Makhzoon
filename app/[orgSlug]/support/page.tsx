'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/ui';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSupportTickets, useCreateTicket } from '@/hooks/support';
import { SupportTicket } from '@/types';
import { formatDate } from '@/lib/utils/date';
import { toast } from '@/hooks/ui';
import { useT } from '@/hooks/ui';
function PlusSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function SupportPage() {
  const { t } = useT();
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const { data: tickets = [], isLoading } = useSupportTickets();
  const createMutation = useCreateTicket();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({ subject, description });
      toast.success(t('support.submitted'));
      setShowNew(false);
      setSubject('');
      setDescription('');
    } catch {
      toast.error(t('support.submitFailed'));
    }
  }

  const columns: ColumnDef<SupportTicket>[] = [
    { key: 'subject', header: t('support.subject'), render: (ticket) => <span className="font-medium text-gray-900 dark:text-gray-100">{ticket.subject}</span> },
    { key: 'status', header: t('support.status'), render: (ticket) => <StatusBadge status={ticket.status} /> },
    { key: 'priority', header: t('support.priority'), render: (ticket) => <StatusBadge status={ticket.priority} /> },
    { key: 'createdAt', header: t('support.created'), render: (ticket) => formatDate(new Date(ticket.createdAt)) },
    {
      key: 'actions', header: '',
      render: (ticket) => (
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); router.push(`/${orgSlug}/support/${ticket.id}`); }}>
          {t('support.view')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('nav.support')}
        actions={
          <Button size="sm" onClick={() => setShowNew(true)}>
            <PlusSVG /><span className="ml-1">{t('support.submitTicket')}</span>
          </Button>
        }
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable
          data={tickets}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('support.noTickets')}
          keyExtractor={(ticket) => ticket.id}
          onRowClick={(ticket) => router.push(`/${orgSlug}/support/${ticket.id}`)}
        />
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('support.newTicket')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subject">{t('support.subject')}</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('support.subjectPlaceholder')} required minLength={5} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">{t('support.description')}</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('support.descPlaceholder')} rows={5} required minLength={20} maxLength={5000} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNew(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? t('support.submitting') : t('support.submitTicket')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
