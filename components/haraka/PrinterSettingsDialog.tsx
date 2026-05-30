'use client';

import { useEffect, useState } from 'react';
import { Printer, Plug2, Unplug, TestTube2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePrinterStore } from '@/store/printer.store';
import { isWebUsbSupported, printRaw } from '@/lib/modules/haraka/printing/webusb-transport';
import { EscPosBuilder } from '@/lib/modules/haraka/printing/escpos-builder';
import { toast } from '@/hooks/ui';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrinterSettingsDialog({ open, onOpenChange }: Props) {
  const { paperWidth, copies, paired, hydrate, pair, unpair, setPaperWidth, setCopies } = usePrinterStore();
  const [busy, setBusy] = useState(false);
  const supported = isWebUsbSupported();

  useEffect(() => {
    if (open) hydrate();
  }, [open, hydrate]);

  async function handlePair() {
    setBusy(true);
    try {
      await pair();
      toast.success('Printer paired');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Pairing failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleTestPrint() {
    setBusy(true);
    try {
      const bytes = new EscPosBuilder()
        .init()
        .align('center')
        .bold(true)
        .size(17)
        .line('PRINTER TEST')
        .size(0)
        .bold(false)
        .line('Makhzoon Haraka')
        .feed(1)
        .align('left')
        .line(`Paper width: ${paperWidth} mm`)
        .line(`Copies: ${copies}`)
        .line(new Date().toLocaleString())
        .feed(2)
        .cut()
        .build();
      const ok = await printRaw(bytes);
      if (ok) toast.success('Test page sent');
      else toast.error('No paired printer found');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test print failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer size={18} /> Receipt printer
          </DialogTitle>
        </DialogHeader>

        {!supported ? (
          <p className="text-sm text-amber-700">
            Your browser doesn&apos;t expose WebUSB. Use Chrome, Edge, or Brave to pair a thermal printer.
            Receipts can still be viewed on screen.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-surface-page px-3 py-2 text-sm flex items-center justify-between">
              <span className="text-gray-500">Status</span>
              <span className={paired ? 'text-green-700' : 'text-gray-700'}>
                {paired ? 'Paired ✓' : 'Not paired'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-500">Paper width</label>
                <Select value={String(paperWidth)} onValueChange={(v) => setPaperWidth(Number(v) as 58 | 80)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58">58 mm</SelectItem>
                    <SelectItem value="80">80 mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-500">Copies per sale</label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={copies}
                  onChange={(e) => setCopies(Number(e.target.value || 1))}
                />
              </div>
            </div>

            <div className="flex gap-2">
              {paired ? (
                <Button variant="outline" onClick={unpair} disabled={busy}>
                  <Unplug size={14} className="me-1" /> Unpair
                </Button>
              ) : (
                <Button onClick={handlePair} disabled={busy}>
                  <Plug2 size={14} className="me-1" /> Pair printer
                </Button>
              )}
              <Button variant="outline" onClick={handleTestPrint} disabled={busy || !paired}>
                <TestTube2 size={14} className="me-1" /> Test print
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
