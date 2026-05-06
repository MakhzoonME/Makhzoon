'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/ui';

function SendSVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M12.5 1.5L1 5.5l4.5 2 2 4.5 5-10.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" /><path d="M5.5 7.5L8.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
}

export function RequestInventoryModal({ open, onOpenChange, itemId, itemName }: Props) {
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleClose(o: boolean) {
    if (!o) setDescription('');
    onOpenChange(o);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'REFILL', inventoryItemId: itemId, description }),
      });
      if (!res.ok) throw new Error();
      toast.success('Request submitted');
      handleClose(false);
    } catch {
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Request Refill</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 pt-2 pb-4">
            <div className="text-[14px] text-gray-600">
              Item: <span className="font-medium text-gray-900">{itemName}</span>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Description *</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe why you need a refill..."
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !description.trim()}>
              <SendSVG />
              <span className="ms-1">{submitting ? 'Submitting...' : 'Submit'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
