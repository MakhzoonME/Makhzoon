'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Subscription } from '@/types';
import { formatDate } from '@/lib/utils/date';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export default function OrgSubscriptionPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params;
  const router = useRouter();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');

  const { data: sub, isLoading } = useQuery<Subscription>({
    queryKey: ['subscription', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/subscription`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setEndDate(data.endDate ? new Date(data.endDate).toISOString().slice(0, 10) : '');
      setStatus(data.status);
      return data;
    },
  });

  async function handleUpdate() {
    setLoading(true);
    try {
      await fetch(`/api/organizations/${orgId}/subscription`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endDate: new Date(endDate), status }),
      });
      toast.success('Subscription updated');
      qc.invalidateQueries({ queryKey: ['subscription', orgId] });
    } catch { toast.error('Failed to update subscription'); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader
        title="Subscription Management"
        breadcrumb={[{ label: 'Organizations', href: '/super-admin' }, { label: 'Subscription', href: '' }]}
      />
      <Card className="max-w-md">
        <CardContent className="p-6 space-y-4">
          {sub && (
            <>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Current Status</span>
                <StatusBadge status={sub.status} />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Start Date</span>
                <span className="text-sm font-medium">{formatDate(sub.startDate)}</span>
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label>New End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm">
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleUpdate} disabled={loading || isLoading}>{loading ? 'Saving...' : 'Update Subscription'}</Button>
            <Button variant="outline" onClick={() => router.back()}>Back</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
