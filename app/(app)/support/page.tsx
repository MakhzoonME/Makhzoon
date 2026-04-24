'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSupportTickets, useCreateTicket } from '@/hooks/useSupportTickets';
import { SupportTicket } from '@/types';
import { formatDate } from '@/lib/utils/date';
import { Plus } from 'lucide-react';

export default function SupportPage() {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const { data: tickets = [], isLoading } = useSupportTickets();
  const createMutation = useCreateTicket();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createMutation.mutateAsync({ subject, description });
      setShowNew(false);
      setSubject('');
      setDescription('');
    } catch {
      setError('Failed to create ticket. Please try again.');
    }
  }

  const columns: ColumnDef<SupportTicket>[] = [
    {
      key: 'subject',
      header: 'Subject',
      render: (t) => <span className="font-medium text-gray-900">{t.subject}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (t) => <StatusBadge status={t.priority} />,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (t) => formatDate(new Date(t.createdAt)),
    },
    {
      key: 'actions',
      header: '',
      render: (t) => (
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); router.push(`/support/${t.id}`); }}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        actions={
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-1" /> Submit Ticket
          </Button>
        }
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable
          data={tickets}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No support tickets yet."
          keyExtractor={(t) => t.id}
          onRowClick={(t) => router.push(`/support/${t.id}`)}
        />
      </div>

      <Dialog open={showNew} onOpenChange={(o) => { setShowNew(o); setError(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit New Ticket</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                required
                minLength={5}
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe your issue in detail…"
                rows={5}
                required
                minLength={20}
                maxLength={5000}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Submitting…' : 'Submit Ticket'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
