'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
function ClipboardCheckSVG() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden><rect x="4" y="3" width="12" height="14" rx="1" stroke="currentColor" strokeWidth="1.4" fill="none" /><path d="M7 3v2h6V3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M7 10l2.5 2.5 4-4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

export default function NewAuditPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();
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
      router.push(`/${orgSlug}/inventory/audits/${id}`);
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
        breadcrumb={[{ label: 'Inventory', href: '/inventory' }, { label: 'Audits', href: '/inventory/audits' }, { label: 'New', href: '/inventory/audits/new' }]}
      />
      <div className="max-w-lg">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <ClipboardCheckSVG />
          <p className="text-sm text-indigo-800">
            Starting an audit will load all active assets. You&apos;ll check each one off as found or mark it missing.
          </p>
        </div>
        <form onSubmit={handleStart} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
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
