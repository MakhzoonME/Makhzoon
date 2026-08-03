'use client';

import { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (pin: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function DiscountApprovalPinDialog({ open, onOpenChange, onSubmit, loading, error }: Props) {
  const [pin, setPin] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPin('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  function submit() {
    if (pin.length !== 4) return;
    onSubmit(pin);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck size={16} /> Discount approval
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This discount needs approval. Ask an approver to enter their 4-digit PIN.
          </p>
          <Input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="\d*"
            maxLength={4}
            placeholder="••••"
            className="text-center text-xl tracking-widest"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            disabled={loading}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={submit} disabled={loading || pin.length !== 4} style={{ background: 'var(--mod-haraka)' }}>
            {loading ? 'Verifying…' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
