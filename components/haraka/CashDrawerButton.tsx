'use client';

import { useRef, useState } from 'react';
import { Vault } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useCashDrawerConfig, useVerifyDrawerPin } from '@/hooks/haraka';
import { openCashDrawer } from '@/lib/modules/haraka/printing/webusb-transport';
import { toast } from '@/hooks/ui';

interface Props {
  /** Only show the button when a session is active */
  sessionActive: boolean;
}

export function CashDrawerButton({ sessionActive }: Props) {
  const { data } = useCashDrawerConfig();
  const verifyMut = useVerifyDrawerPin();
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = data?.config;

  if (!config?.enabled || !sessionActive) return null;

  async function kick() {
    setBusy(true);
    try {
      const ok = await openCashDrawer({
        port:      config!.drawerPort,
        onTimeMs:  config!.onTimeMs,
        offTimeMs: config!.offTimeMs,
      });
      if (!ok) toast.error('No printer paired — connect a printer to open the drawer');
    } catch {
      toast.error('Could not open cash drawer');
    } finally {
      setBusy(false);
    }
  }

  async function handleButtonClick() {
    if (config?.requirePin) {
      setPin('');
      setPinOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      await kick();
    }
  }

  async function handlePinSubmit() {
    if (pin.length < 4) { toast.error('PIN must be at least 4 digits'); return; }
    setBusy(true);
    try {
      const ok = await verifyMut.mutateAsync(pin);
      if (ok) {
        setPinOpen(false);
        setPin('');
        await kick();
      } else {
        toast.error('Incorrect PIN');
        setPin('');
        inputRef.current?.focus();
      }
    } catch {
      toast.error('PIN verification failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleButtonClick}
        disabled={busy}
        title="Open cash drawer"
        className="gap-1.5"
      >
        <Vault className="h-4 w-4" strokeWidth={1.75} />
        <span className="hidden sm:inline">Cash drawer</span>
      </Button>

      <Dialog open={pinOpen} onOpenChange={(o) => { setPinOpen(o); if (!o) setPin(''); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Vault size={16} /> Open cash drawer
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter the cash drawer PIN to open.</p>
            <Input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              placeholder="••••"
              className="text-center text-xl tracking-widest"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePinSubmit(); }}
              disabled={busy}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={handlePinSubmit} disabled={busy || pin.length < 4}
              style={{ background: 'var(--mod-haraka)' }}>
              {busy ? 'Verifying…' : 'Open'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
