'use client';
import { useState } from 'react';
import { useMaintenance, useCreateMaintenance, useDeleteMaintenance } from '@/hooks/assets';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { formatDate } from '@/lib/utils/date';
import { toast } from '@/hooks/ui';
function Trash2SVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 3.5h10M5.5 3.5V2.5h3v1M4 3.5l.75 8h4.5L10 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function WrenchSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M10.5 2a3.5 3.5 0 0 0-3.4 4.3L2 11.5 2.5 13.5l2 .5 5.2-5.1A3.5 3.5 0 0 0 10.5 2z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
      <circle cx="10.5" cy="5.5" r="1" fill="currentColor" />
    </svg>
  );
}
function PlusSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
import { MAINTENANCE_TYPES, MaintenanceType } from '@/types';

const TYPE_BG: Record<MaintenanceType, string> = {
  repair: 'bg-orange-50 text-orange-700',
  service: 'bg-indigo-50 text-indigo-700',
  inspection: 'bg-purple-50 text-purple-700',
  upgrade: 'bg-green-50 text-green-700',
  other: 'bg-gray-100 text-gray-700',
};

export function MaintenanceSection({ assetId }: { assetId: string }) {
  const { user } = useAuthStore();
  const { data: records = [], isLoading } = useMaintenance(assetId);
  const createMut = useCreateMaintenance(assetId);
  const deleteMut = useDeleteMaintenance(assetId);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<MaintenanceType>('service');
  const [description, setDescription] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [cost, setCost] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';
  const totalCost = records.reduce((sum, r) => sum + (r.cost ?? 0), 0);

  function reset() {
    setType('service');
    setDescription('');
    setPerformedBy('');
    setCost('');
    setDate(new Date().toISOString().slice(0, 10));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    try {
      await createMut.mutateAsync({
        type,
        description: description.trim(),
        performedBy: performedBy.trim() || undefined,
        cost: cost ? Number(cost) : undefined,
        date,
      });
      reset();
      setShowForm(false);
      toast.success('Maintenance logged');
    } catch {
      toast.error('Failed to log maintenance');
    }
  }

  async function handleDelete(recordId: string) {
    try {
      await deleteMut.mutateAsync(recordId);
      toast.success('Record removed');
    } catch {
      toast.error('Failed to remove record');
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
        <WrenchSVG />
        <h2 className="text-sm font-semibold text-gray-900">Maintenance</h2>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {records.length} record{records.length === 1 ? '' : 's'}
            {totalCost > 0 && ` · ${totalCost.toFixed(2)} JOD`}
          </span>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
              <PlusSVG /><span className="ml-1">{showForm ? 'Cancel' : 'Add'}</span>
            </Button>
          )}
        </div>
      </div>

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type</label>
              <Select value={type} onValueChange={(v) => setType(v as MaintenanceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date</label>
              <DatePicker value={date} onChange={(v) => setDate(v)} placeholder="Select date" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Performed by</label>
              <Input value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} placeholder="Vendor / person" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Cost (JOD)</label>
              <Input type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={createMut.isPending}>
              {createMut.isPending ? 'Saving…' : 'Save record'}
            </Button>
          </div>
        </form>
      )}

      <div>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-14 rounded-md bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">No maintenance records.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {records.map((r) => (
              <li key={r.id} className="px-5 py-3 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ${TYPE_BG[r.type]}`}>
                        {r.type}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(r.date)}</span>
                      {r.cost !== undefined && r.cost !== null && (
                        <span className="text-xs font-medium text-gray-600 ml-auto">{r.cost.toFixed(2)} JOD</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900">{r.description}</p>
                    {r.performedBy && <p className="text-xs text-gray-500 mt-0.5">By {r.performedBy}</p>}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                      title="Delete record"
                    >
                      <Trash2SVG />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
