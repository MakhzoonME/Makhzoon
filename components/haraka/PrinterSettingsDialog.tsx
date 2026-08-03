'use client';

import { useEffect, useState } from 'react';
import { Printer, Plug2, Unplug, TestTube2, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePrinterStore } from '@/store/printer.store';
import { isWebUsbSupported, printRaw } from '@/lib/modules/haraka/printing/webusb-transport';
import { EscPosBuilder } from '@/lib/modules/haraka/printing/escpos-builder';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import { toast } from '@/hooks/ui';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Org-wide receipt/print config — paper size, copies, cut feed are set once
   *  in Settings > Receipt and apply to every register, not per-browser. */
  config: ReceiptConfig;
}

export function PrinterSettingsDialog({ open, onOpenChange, config }: Props) {
  const { paired, hydrate, pair, unpair } = usePrinterStore();
  const [busy, setBusy] = useState(false);
  const supported = isWebUsbSupported();
  const paperWidth = config.template === 'thermal-80' ? 80 : 58;

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
        .line(`Copies: ${config.copies}`)
        .line(`Cut feed: ${config.cutFeed}`)
        .line(new Date().toLocaleString())
        .feed(1)
        .cut(config.cutFeed)
        .build();
      const ok = await printRaw(bytes, config.copies);
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

        <DialogBody>
          {!supported ? (
            <p className="text-sm text-amber-700">
              Your browser doesn&apos;t expose WebUSB. Use Chrome, Edge, or Brave to pair a thermal printer.
              Receipts can still be viewed on screen.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-surface-inset px-4 py-3 text-sm flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <span className={paired ? 'text-green-700 font-medium' : 'text-gray-700'}>
                  {paired ? <span className="flex items-center gap-1.5"><Check size={14} /> Paired</span> : 'Not paired'}
                </span>
              </div>

              <div className="rounded-lg border border-border bg-surface-page px-4 py-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Paper width</span>
                  <span className="font-medium text-gray-700">{paperWidth} mm</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Copies per sale</span>
                  <span className="font-medium text-gray-700">{config.copies}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Cut feed</span>
                  <span className="font-medium text-gray-700">{config.cutFeed} lines</span>
                </div>
                <p className="text-xs text-gray-400 pt-1">
                  Set for the whole business in Settings → Receipt, not per computer.
                </p>
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
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
