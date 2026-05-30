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
import { Plus } from 'lucide-react';

export default function SupportPage() {
  const { t, locale } = useT();
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | 'none'>('desc');

  const { data: ticketsData, isLoading } = useSupportTickets({ page, pageSize, sortBy: sortDir === 'none' ? undefined : sortBy, sortDir: sortDir === 'none' ? undefined : sortDir });
  const tickets = ticketsData?.items ?? [];
  const total = ticketsData?.total ?? 0;
  const totalPages = ticketsData?.totalPages ?? 1;
  const createMutation = useCreateTicket();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({ subject, description });
      toast.success(t('support.submitted'));
      setShowNew(false);
      setSubject('');
      setDescription('');
      setPage(1);
    } catch {
      toast.error(t('support.submitFailed'));
    }
  }

  const columns: ColumnDef<SupportTicket>[] = [
    { key: 'subject', header: t('support.subject'), render: (ticket) => <span className="font-medium text-gray-900">{ticket.subject}</span>, sortable: true },
    { key: 'status', header: t('support.status'), render: (ticket) => <StatusBadge status={ticket.status} />, sortable: true },
    { key: 'priority', header: t('support.priority'), render: (ticket) => <StatusBadge status={ticket.priority} />, sortable: true },
    { key: 'createdAt', header: t('support.created'), render: (ticket) => formatDate(new Date(ticket.createdAt)), sortable: true },
    {
      key: 'actions', header: '',
      render: (ticket) => (
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/${orgSlug}/support/${ticket.id}`); }}>
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
            <Plus className="h-4 w-4" strokeWidth={1.75} /><span className="ms-1">{t('support.submitTicket')}</span>
          </Button>
        }
      />

      <div className="bg-surface-card rounded-lg border border-border">
        <DataTable
          data={tickets}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('support.noTickets')}
          keyExtractor={(ticket) => ticket.id}
          onRowClick={(ticket) => router.push(`/${locale}/${orgSlug}/support/${ticket.id}`)}
          pagination={{
            page,
            pageSize,
            total,
            totalPages,
            onPageChange: setPage,
            onPageSizeChange: (newSize) => { setPageSize(newSize); setPage(1); },
            onSortChange: (newSortBy, newSortDir) => { setSortBy(newSortBy); setSortDir(newSortDir); setPage(1); },
            currentSortBy: sortDir === 'none' ? undefined : sortBy,
            currentSortDir: sortDir,
          }}
        />
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('support.newTicket')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 px-6 pt-4 pb-2">
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
