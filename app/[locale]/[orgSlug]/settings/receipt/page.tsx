'use client';

import { useEffect, useState } from 'react';
import { Printer, Plug2, Unplug, TestTube2 } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { usePrinterStore } from '@/store/printer.store';
import { isWebUsbSupported, printRaw } from '@/lib/modules/haraka/printing/webusb-transport';
import { EscPosBuilder } from '@/lib/modules/haraka/printing/escpos-builder';
import { toast, useT, useOrgSlug } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { useAdminGuard } from '@/hooks/ui';

export default function ReceiptSettingsPage() {
  const { t } = useT();
  const orgSlug = useOrgSlug();
  const { data: orgInfo } = useOrgInfo();
  const { isAllowed } = useAdminGuard('settings.fawtara');

  const { paperWidth, copies, paired, hydrate, pair, unpair, setPaperWidth, setCopies } = usePrinterStore();
  const [busy, setBusy] = useState(false);
  const supported = isWebUsbSupported();

  useEffect(() => { hydrate(); }, [hydrate]);

  if (!isAllowed) return null;

  async function handlePair() {
    setBusy(true);
    try {
      await pair();
      toast.success(t('register.printer'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.updateFailed'));
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
      if (ok) toast.success(t('register.reprintLast'));
      else toast.error(t('common.updateFailed'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.updateFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader
        title={t('nav.receipt')}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: t('nav.settings') },
          { label: t('nav.receipt') },
        ]}
      />

      <Card>
        <CardContent className="p-5 space-y-5">
          {/* Printer status */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-page px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Printer size={16} />
              {t('register.printer')}
            </div>
            <span className={`text-sm font-medium ${paired ? 'text-green-700' : 'text-gray-500'}`}>
              {paired ? '● Paired' : '○ Not paired'}
            </span>
          </div>

          {!supported ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
              Your browser doesn&apos;t support WebUSB. Use Chrome, Edge, or Brave to pair a thermal printer.
            </p>
          ) : (
            <>
              {/* Paper width + copies */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Paper width</label>
                  <Select
                    value={String(paperWidth)}
                    onValueChange={(v) => setPaperWidth(Number(v) as 58 | 80)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58">58 mm</SelectItem>
                      <SelectItem value="80">80 mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Copies per sale</label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={copies}
                    onChange={(e) => setCopies(Number(e.target.value || 1))}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-border">
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
