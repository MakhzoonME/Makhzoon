'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/useToast';
import { Warranty } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

interface RequestActionPanelProps {
  assetId: string;
  warranties: Warranty[];
}

type RequestType = 'REFILL' | 'RETIRE' | 'BUY_NEW' | 'EXTEND_WARRANTY';

export function RequestActionPanel({ assetId, warranties }: RequestActionPanelProps) {
  const [openType, setOpenType] = useState<RequestType | null>(null);
  const [description, setDescription] = useState('');
  const [warrantyId, setWarrantyId] = useState('');
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  function openModal(type: RequestType) {
    setOpenType(type);
    setDescription('');
    setWarrantyId('');
  }

  async function handleSubmit() {
    if (!description.trim()) return;
    setLoading(true);
    try {
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: openType,
          assetId: openType !== 'BUY_NEW' ? assetId : undefined,
          warrantyId: openType === 'EXTEND_WARRANTY' ? warrantyId : undefined,
          description,
        }),
      });
      toast.success('Request submitted for review');
      qc.invalidateQueries({ queryKey: ['requests'] });
      setOpenType(null);
    } catch { toast.error('Failed to submit request'); }
    finally { setLoading(false); }
  }

  const typeLabel: Record<RequestType, string> = {
    REFILL: 'Request Refill',
    RETIRE: 'Request Retire',
    BUY_NEW: 'Request Buy New',
    EXTEND_WARRANTY: 'Request Extend Warranty',
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">REQUEST ACTIONS</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => openModal('REFILL')}>Request Refill</Button>
          <Button variant="outline" size="sm" onClick={() => openModal('RETIRE')}>Request Retire</Button>
          <Button variant="outline" size="sm" onClick={() => openModal('BUY_NEW')}>Request Buy New</Button>
          {warranties.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => openModal('EXTEND_WARRANTY')}>Request Extend Warranty</Button>
          )}
        </div>
      </div>

      <Dialog open={!!openType} onOpenChange={(o) => !o && setOpenType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{openType ? typeLabel[openType] : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {openType === 'EXTEND_WARRANTY' && warranties.length > 0 && (
              <div className="space-y-1.5">
                <Label>Warranty</Label>
                <Select value={warrantyId} onValueChange={setWarrantyId}>
                  <SelectTrigger><SelectValue placeholder="Select warranty" /></SelectTrigger>
                  <SelectContent>
                    {warranties.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.vendor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the reason for this request..."
                rows={4}
              />
              {!description.trim() && <p className="text-xs text-red-600">Description is required</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenType(null)} disabled={loading}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading || !description.trim()}>
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
