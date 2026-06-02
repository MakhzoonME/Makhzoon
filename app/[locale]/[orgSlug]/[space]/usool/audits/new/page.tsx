'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug, useSpace, useT } from '@/hooks/ui';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';

export default function NewAuditPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const { locale } = useT();
  const qc = useQueryClient();
  const [title, setTitle] = useState(`Audit ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, notes }),
      });
      if (!res.ok) throw new Error();
      const { id } = await res.json();
      toast.success('Audit started');
      qc.invalidateQueries({ queryKey: ['inventory-audits'] });
      router.push(`/${locale}/${orgSlug}/${space}/usool/audits/${id}`);
    } catch {
      toast.error('Failed to start audit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Start Physical Audit"
        breadcrumb={[{ label: 'Usool', href: `/${locale}/${orgSlug}/${space}/usool` }, { label: 'Audits', href: `/${locale}/${orgSlug}/${space}/usool/audits` }, { label: 'New', href: `/${locale}/${orgSlug}/${space}/usool/audits/new` }]}
      />
      <div className="max-w-lg mx-auto">
        <div className="bg-[var(--primary-50)] border border-[var(--primary-100)] rounded-lg p-4 mb-6 flex items-start gap-3">
          <ClipboardCheck className="h-4 w-4" strokeWidth={1.75} />
          <p className="text-sm text-[var(--primary-700)]">
            Starting an audit will load all active assets. You&apos;ll check each one off as found or mark it missing.
          </p>
        </div>
        <form onSubmit={handleStart} className="bg-surface-card rounded-lg border border-border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audit Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any notes about this audit..." />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>{loading ? 'Starting...' : 'Start Audit'}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
